import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Cpu, QrCode, ShieldCheck, PlugZap, ArrowRight, Camera, Image as ImageIcon, FileUp, CheckCircle2, Loader2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/features/auth/services/authService";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useRef } from "react";
import mqtt from "mqtt";

const MQTT_BROKER = "wss://862ddab18768410486982f71e1ac75bb.s1.eu.hivemq.cloud:8884/mqtt";
const MQTT_USERNAME = "GreenCropnat";
const MQTT_PASSWORD = "GreenCropnat123456";
const MQTT_SENSOR_TOPIC = "smartfarm/sensors";

const showPairingSosToast = (title: string, description?: string) => {
  toast.custom((toastId) => (
    <div className="pointer-events-auto w-[min(92vw,560px)] overflow-hidden rounded-2xl border-2 border-red-700 bg-red-600 text-white shadow-[0_28px_90px_rgba(127,29,29,0.45)]">
      <div className="flex items-start gap-4 px-5 py-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/35">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-red-100">SOS Alert</div>
          <div className="mt-1 text-xl font-bold leading-7">{title}</div>
          {description && (
            <div className="mt-2 text-sm leading-6 text-red-50">{description}</div>
          )}
        </div>
        <button
          type="button"
          className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white hover:bg-white/25"
          onClick={() => toast.dismiss(toastId)}
        >
          ปิด
        </button>
      </div>
    </div>
  ), {
    duration: 9000,
    position: "bottom-center",
  });
};

const getSessionTenantId = () => {
  const raw = localStorage.getItem("smart_iot_session");
  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw);
    return String(parsed?.user?.id || parsed?.id || "");
  } catch {
    return "";
  }
};

type PairingConnectionState =
  | { status: "idle" }
  | { status: "checking"; title: string; description: string }
  | { status: "connected"; title: string; description: string; deviceId: string; pairingCode: string }
  | { status: "failed"; title: string; description: string; deviceId: string; pairingCode: string };

const parseMqttJson = (raw: string) => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
};

const matchesPairingAck = (
  incomingTopic: string,
  raw: string,
  statusTopic: string,
  deviceId: string,
  pairingCode: string,
) => {
  const parsed = parseMqttJson(raw);
  const status = String(parsed?.status || parsed?.pairing_status || "").toUpperCase();
  const incomingDeviceId = String(parsed?.device_id || "").toUpperCase();
  const incomingPairingCode = String(parsed?.pairing_code || "");

  if (
    incomingDeviceId === deviceId &&
    incomingPairingCode === pairingCode &&
    (status === "PAIRED" || status === "PAIRING_PAIRED")
  ) {
    return incomingTopic === statusTopic || incomingTopic === MQTT_SENSOR_TOPIC;
  }

  return incomingTopic === statusTopic &&
    raw.includes("PAIRED") &&
    raw.includes(deviceId) &&
    raw.includes(pairingCode);
};

const publishPairingAck = (deviceId: string, pairingCode: string) => {
  const tenantId = getSessionTenantId();
  if (!tenantId) return Promise.resolve(false);

  const topic = `greencrop/devices/${deviceId}/pairing`;
  const statusTopic = `${topic}/status`;
  const responseTopics = [statusTopic, MQTT_SENSOR_TOPIC];
  const payload = JSON.stringify({
    project: "GreenCrop NAT IoT",
    status: "PAIRED",
    tenant_id: tenantId,
    device_id: deviceId,
    pairing_code: pairingCode,
    timestamp: Date.now(),
  });

  return new Promise<boolean>((resolve) => {
    let timeoutId: number | undefined;
    const client = mqtt.connect(MQTT_BROKER, {
      clientId: `greencrop_pairing_${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      connectTimeout: 8000,
      reconnectPeriod: 0,
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
    });
    let finished = false;

    const finish = (ok: boolean) => {
      if (finished) return;
      finished = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      client.end(true);
      resolve(ok);
    };

    timeoutId = window.setTimeout(() => finish(false), 15000);

    client.on("connect", () => {
      client.subscribe(responseTopics, { qos: 0 }, (subscribeErr) => {
        if (subscribeErr) {
          finish(false);
          return;
        }

        client.publish(topic, payload, { qos: 0, retain: false }, (err) => {
          if (err) {
            finish(false);
          }
        });
      });
    });

    client.on("message", (incomingTopic, message) => {
      const raw = message.toString();
      if (matchesPairingAck(incomingTopic, raw, statusTopic, deviceId, pairingCode)) {
        finish(true);
      }
    });

    client.on("error", () => {
      finish(false);
    });
  });
};

type DevicePairingPageProps = {
  user?: { name?: string; email?: string };
  onPaired: (payload: { deviceId: string; pairingCode: string }) => void;
  onSkip: () => void;
  language?: string;
};

export function DevicePairingPage({ user, onPaired, onSkip, language = "TH" }: DevicePairingPageProps) {
  const isTH = language === "TH";
  const t = (th: string, en: string) => (isTH ? th : en);
  const [deviceId, setDeviceId] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [connectionState, setConnectionState] = useState<PairingConnectionState>({ status: "idle" });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerRef = useRef<any>(null);

  const validate = () => {
    if (!deviceId.trim()) return t("กรุณากรอก Device ID", "Please enter Device ID");
    if (!pairingCode.trim()) return t("กรุณากรอก Pairing Code", "Please enter Pairing Code");
    if (deviceId.trim().length < 8) return t("Device ID สั้นเกินไป", "Device ID is too short");
    if (!/^[0-9A-Za-z]+$/.test(deviceId.trim())) return t("Device ID ต้องเป็นตัวอักษร/ตัวเลขเท่านั้น", "Device ID must be alphanumeric");
    if (!/^[0-9]{6,8}$/.test(pairingCode.trim())) return t("Pairing Code ต้องเป็นตัวเลข 6-8 หลัก", "Pairing Code must be 6-8 digits");
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
      toast.error(t("สแกนไฟล์ไม่สำเร็จ", "Failed to scan file"));
    } finally {
      scanner.clear().catch(() => {});
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    const nextError = validate();
    setError(nextError);
    setConnectionState({ status: "idle" });
    if (nextError) return;

    try {
      setSubmitting(true);
      const normalizedDeviceId = deviceId.trim().toUpperCase();
      const normalizedPairingCode = pairingCode.trim();
      setConnectionState({
        status: "checking",
        title: t("กำลังตรวจสอบบอร์ด", "Checking board"),
        description: t("ระบบกำลังส่งสัญญาณไปที่บอร์ดและรอการตอบกลับก่อนบันทึกการจับคู่", "Sending a signal to the board and waiting for acknowledgement before saving the pairing"),
      });
      const ackSent = await publishPairingAck(normalizedDeviceId, normalizedPairingCode);
      if (!ackSent) {
        const alertTitle = t("บอร์ดหรืออุปกรณ์ยังไม่ได้ทำงาน", "Board or device is not running");
        const alertDescription = t(
          "ยังไม่บันทึกการจับคู่ กรุณาเปิด NodeMCU ตรวจ Wi‑Fi/MQTT แล้วลองอีกครั้ง",
          "Pairing was not saved. Please power on the NodeMCU, check Wi‑Fi/MQTT, and try again",
        );
        setConnectionState({
          status: "failed",
          title: alertTitle,
          description: alertDescription,
          deviceId: normalizedDeviceId,
          pairingCode: normalizedPairingCode,
        });
        showPairingSosToast(alertTitle, alertDescription);
        return;
      }
      await authService.pairDevice({
        device_id: normalizedDeviceId,
        pairing_code: normalizedPairingCode,
        device_name: deviceName.trim() || undefined,
        location: location.trim() || undefined,
        is_primary: true,
      });
      setConnectionState({
        status: "connected",
        title: t("เชื่อมต่อบอร์ดสำเร็จ", "Board connected successfully"),
        description: t("บอร์ดตอบกลับแล้ว ระบบพร้อมเข้าสู่แดชบอร์ด", "The board acknowledged the pairing and is ready for the dashboard"),
        deviceId: normalizedDeviceId,
        pairingCode: normalizedPairingCode,
      });
      toast.success(t("จับคู่อุปกรณ์สำเร็จ", "Device paired successfully"));
      window.setTimeout(() => {
        onPaired({ deviceId: normalizedDeviceId, pairingCode: normalizedPairingCode });
      }, 900);
    } catch (err: any) {
      const alertTitle = t("จับคู่อุปกรณ์ไม่สำเร็จ", "Device pairing failed");
      const alertDescription = err?.message || t("ระบบไม่สามารถบันทึกการจับคู่ได้ กรุณาตรวจสอบข้อมูลแล้วลองใหม่", "The system could not save the pairing. Please check the details and try again");
      setConnectionState({
        status: "failed",
        title: alertTitle,
        description: alertDescription,
        deviceId: deviceId.trim().toUpperCase(),
        pairingCode: pairingCode.trim(),
      });
      showPairingSosToast(alertTitle, alertDescription);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-slate-950/40 text-foreground">
      <header className="solid-surface border-b border-border/60 px-6 py-5 md:px-10">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-2 text-primary">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{t("จับคู่เครื่องก่อนเริ่มใช้งาน", "Pair device before use")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("ยืนยันว่าเป็นเครื่องจริงของคุณก่อนเข้าแดชบอร์ด", "Verify device ownership before accessing the dashboard")}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit border-primary/30 text-primary">
            {t("ต้องทำครั้งแรก", "First-time setup")}
          </Badge>
        </div>
      </header>

      <main className="page-solid-cards mx-auto grid w-full max-w-5xl gap-6 px-6 py-10 md:grid-cols-[1.1fr_0.9fr] md:px-10">
        <Card className="rounded-2xl border-border/70 bg-card shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              {t("ยืนยันความเป็นเจ้าของอุปกรณ์", "Confirm device ownership")}
            </CardTitle>
            <CardDescription>
              {t("ใช้ Device ID และ Pairing Code จากบอร์ด ESP32 (OLED/LCD หรือ QR)", "Use Device ID and Pairing Code from ESP32 board (OLED/LCD or QR)")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3">
              <label className="text-sm font-medium text-foreground">Device ID</label>
              <Input
                placeholder={t("เช่น 7C9EBDAB12CD", "e.g. 7C9EBDAB12CD")}
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium text-foreground">{t("Device Name (ตั้งชื่อเครื่อง)", "Device Name")}</label>
              <Input
                placeholder={t("เช่น เครื่องไข่ผำ บ่อ A", "e.g. Wolffia Machine Pond A")}
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium text-foreground">{t("Location", "Location")}</label>
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

            {connectionState.status !== "idle" && (
              <div
                className={[
                  "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
                  connectionState.status === "connected"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : connectionState.status === "failed"
                      ? "border-red-600/60 bg-red-600/15 text-red-700 shadow-[0_18px_60px_rgba(185,28,28,0.22)] dark:text-red-200"
                      : "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
                ].join(" ")}
              >
                {connectionState.status === "checking" && <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />}
                {connectionState.status === "connected" && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
                {connectionState.status === "failed" && <XCircle className="mt-0.5 h-5 w-5 shrink-0" />}
                <div className="space-y-1">
                  <div className="font-medium">{connectionState.title}</div>
                  <div className="text-xs opacity-90">{connectionState.description}</div>
                </div>
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
          <Card className="rounded-2xl border-border/60 bg-card shadow-lg">
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

            <Card className="rounded-2xl border-border/60 bg-card shadow-lg">
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

          <Card className="rounded-2xl border-border/60 bg-card shadow-lg">
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
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2 rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                  onClick={handlePickFile}
                >
                  <ImageIcon className="h-4 w-4" />
                  เลือกรูป QR
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2 rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                  onClick={handlePickFile}
                >
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
                <div className="flex flex-col items-center gap-3 rounded-xl border border-border/70 bg-card/90 p-4">
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

          <Card className="rounded-2xl border-border/60 bg-card shadow-lg">
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
