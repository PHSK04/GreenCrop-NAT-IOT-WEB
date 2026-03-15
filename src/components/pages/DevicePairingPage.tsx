import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Cpu, QrCode, ShieldCheck, PlugZap, ArrowRight, Camera, Image as ImageIcon, FileUp } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/features/auth/services/authService";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useRef } from "react";

type DevicePairingPageProps = {
  user?: { name?: string; email?: string };
  onPaired: (payload: { deviceId: string; pairingCode: string }) => void;
  onSkip: () => void;
};

export function DevicePairingPage({ user, onPaired, onSkip }: DevicePairingPageProps) {
  const [deviceId, setDeviceId] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerRef = useRef<any>(null);

  const validate = () => {
    if (!deviceId.trim()) return "กรุณากรอก Device ID";
    if (!pairingCode.trim()) return "กรุณากรอก Pairing Code";
    if (deviceId.trim().length < 8) return "Device ID สั้นเกินไป";
    if (!/^[0-9A-Za-z]+$/.test(deviceId.trim())) return "Device ID ต้องเป็นตัวอักษร/ตัวเลขเท่านั้น";
    if (!/^[0-9]{6,8}$/.test(pairingCode.trim())) return "Pairing Code ต้องเป็นตัวเลข 6-8 หลัก";
    return null;
  };

  const isQrInputValid = () =>
    deviceId.trim().length >= 8 &&
    /^[0-9A-Za-z]+$/.test(deviceId.trim()) &&
    /^[0-9]{6,8}$/.test(pairingCode.trim());

  useEffect(() => {
    let isMounted = true;
    if (!isQrInputValid()) {
      setQrDataUrl(null);
      setQrError(null);
      return;
    }

    const payload = JSON.stringify({
      device_id: deviceId.trim().toUpperCase(),
      pairing_code: pairingCode.trim(),
    });

    QRCode.toDataURL(payload, { width: 220, margin: 1 })
      .then((url) => {
        if (!isMounted) return;
        setQrDataUrl(url);
        setQrError(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setQrDataUrl(null);
        setQrError("สร้าง QR ไม่สำเร็จ");
      });

    return () => {
      isMounted = false;
    };
  }, [deviceId, pairingCode]);

  const applyQrPayload = (raw: string) => {
    try {
      const decoded = JSON.parse(raw);
      if (decoded && typeof decoded === "object") {
        const nextDeviceId = String(decoded.device_id || "").trim();
        const nextPairing = String(decoded.pairing_code || "").trim();
        if (nextDeviceId) setDeviceId(nextDeviceId);
        if (nextPairing) setPairingCode(nextPairing);
        toast.success("เติมข้อมูลจาก QR แล้ว");
        return;
      }
    } catch {
      // fall through
    }
    toast.error("ไม่พบข้อมูล QR ที่รองรับ");
  };

  useEffect(() => {
    if (!scanOpen) return;
    let cancelled = false;

    const startScanner = async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const scanner = new Html5Qrcode("qr-camera-reader");
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText: string) => {
            applyQrPayload(decodedText);
            setScanOpen(false);
          },
        );
      } catch (err: any) {
        toast.error(err?.message || "เปิดกล้องไม่สำเร็จ");
        setScanOpen(false);
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => {});
        scanner.clear().catch(() => {});
      }
    };
  }, [scanOpen]);

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-file-reader");
    try {
      const decodedText = await scanner.scanFile(file, true);
      applyQrPayload(decodedText);
    } catch {
      toast.error("สแกนไฟล์ไม่สำเร็จ");
    } finally {
      scanner.clear().catch(() => {});
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    const nextError = validate();
    setError(nextError);
    if (nextError) return;

    try {
      setSubmitting(true);
      const normalizedDeviceId = deviceId.trim().toUpperCase();
      const normalizedPairingCode = pairingCode.trim();
      await authService.pairDevice({
        device_id: normalizedDeviceId,
        pairing_code: normalizedPairingCode,
        device_name: deviceName.trim() || undefined,
        location: location.trim() || undefined,
        is_primary: true,
      });
      toast.success("จับคู่อุปกรณ์สำเร็จ");
      onPaired({ deviceId: normalizedDeviceId, pairingCode: normalizedPairingCode });
    } catch (err: any) {
      toast.error(err?.message || "จับคู่อุปกรณ์ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-slate-950/40 text-foreground">
      <header className="border-b border-border/60 bg-white px-6 py-5 md:px-10">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-2 text-primary">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">จับคู่เครื่องก่อนเริ่มใช้งาน</h1>
              <p className="text-sm text-muted-foreground">
                ยืนยันว่าเป็นเครื่องจริงของคุณก่อนเข้าแดชบอร์ด
              </p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit border-primary/30 text-primary">
            ต้องทำครั้งแรก
          </Badge>
        </div>
      </header>

      <main className="page-solid-cards mx-auto grid w-full max-w-5xl gap-6 px-6 py-10 md:grid-cols-[1.1fr_0.9fr] md:px-10">
        <Card className="rounded-2xl border-border/70 bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              ยืนยันความเป็นเจ้าของอุปกรณ์
            </CardTitle>
            <CardDescription>
              ใช้ Device ID และ Pairing Code จากบอร์ด ESP32 (OLED/LCD หรือ QR)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3">
              <label className="text-sm font-medium text-foreground">Device ID</label>
              <Input
                placeholder="เช่น 7C9EBDAB12CD"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium text-foreground">Device Name (ตั้งชื่อเครื่อง)</label>
              <Input
                placeholder="เช่น เครื่องไข่ผำ บ่อ A"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium text-foreground">Location</label>
              <Input
                placeholder="เช่น โรงเรือน 1 / โซน B"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium text-foreground">Pairing Code</label>
              <Input
                placeholder="6-8 หลัก"
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button onClick={handleSubmit} className="gap-2" disabled={submitting}>
                ยืนยันและเข้าแดชบอร์ด
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={onSkip}>
                ข้ามไปก่อน
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              หากยังไม่มีเครื่องจริง คุณสามารถข้ามไปก่อนและกลับมาจับคู่ภายหลังได้
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl border-border/60 bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PlugZap className="h-5 w-5 text-amber-400" />
                ขั้นตอนบนเครื่องจริง
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">1</span>
                เปิดเครื่อง ESP32 และรอให้จอ OLED/LCD แสดงรหัส
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">2</span>
                จด Device ID และ Pairing Code จากหน้าจอ หรือสแกน QR
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">3</span>
                กรอกข้อมูลทางซ้าย แล้วกดยืนยัน
              </div>
            </CardContent>
          </Card>

            <Card className="rounded-2xl border-border/60 bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode className="h-5 w-5 text-cyan-400" />
                แนะนำรูปแบบ QR
              </CardTitle>
              <CardDescription>แสดงบนจอเพื่อให้ผู้ใช้สแกนได้ทันที</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <code className="block rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-foreground">
                {"{ \"device_id\": \"7C9EBDAB12CD\", \"pairing_code\": \"123456\" }"}
              </code>
              <Separator />
              <p className="text-xs">
                เมื่อสแกน QR แล้ว ให้คัดลอกค่ามากรอก หรือทำ Auto-fill ในอนาคต
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode className="h-5 w-5 text-emerald-400" />
                QR สำหรับจับคู่อุปกรณ์
              </CardTitle>
              <CardDescription>สร้างจาก Device ID และ Pairing Code ที่กรอก</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="gap-2" onClick={() => setScanOpen(true)}>
                  <Camera className="h-4 w-4" />
                  สแกนด้วยกล้อง
                </Button>
                <Button size="sm" variant="outline" className="gap-2" onClick={handlePickFile}>
                  <ImageIcon className="h-4 w-4" />
                  เลือกรูป QR
                </Button>
                <Button size="sm" variant="outline" className="gap-2" onClick={handlePickFile}>
                  <FileUp className="h-4 w-4" />
                  เลือกไฟล์
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div id="qr-file-reader" className="hidden" />
              </div>
              {qrDataUrl ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-border/70 bg-white/90 p-4">
                  <img src={qrDataUrl} alt="Pairing QR" className="h-44 w-44" />
                  <p className="text-xs text-muted-foreground">สแกนเพื่อเติมข้อมูลจับคู่อัตโนมัติ</p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                  กรอก Device ID และ Pairing Code ให้ถูกต้องเพื่อสร้าง QR
                </div>
              )}
              {qrError && (
                <div className="text-xs text-red-400">{qrError}</div>
              )}
            </CardContent>
          </Card>

          <Dialog open={scanOpen} onOpenChange={setScanOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>สแกน QR ด้วยกล้อง</DialogTitle>
              </DialogHeader>
              <div className="overflow-hidden rounded-xl border border-white/80 bg-black/90 p-2">
                <div id="qr-camera-reader" className="min-h-[320px]" />
              </div>
              <p className="text-xs text-muted-foreground">
                หากไม่พบกล้อง โปรดตรวจสอบสิทธิ์การเข้าถึงกล้องในเบราว์เซอร์
              </p>
            </DialogContent>
          </Dialog>

          <Card className="rounded-2xl border-border/60 bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">ผู้ใช้งานปัจจุบัน</CardTitle>
              <CardDescription>ข้อมูลนี้จะผูกกับบัญชี</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{user?.name || "Unknown User"}</div>
              <div>{user?.email || "-"}</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
