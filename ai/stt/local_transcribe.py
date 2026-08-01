"""Local faster-whisper adapter. Audio bytes arrive on stdin; JSON leaves stdout."""
import argparse, json, os, sys, tempfile

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--stdin', action='store_true')
    parser.add_argument('--model', default='small')
    parser.add_argument('--language', default='th')
    args = parser.parse_args()
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise SystemExit('Install faster-whisper from ai/requirements-voice-local.txt')
    data = sys.stdin.buffer.read()
    if not data: raise SystemExit('No audio supplied')
    with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as handle:
        handle.write(data); audio_path = handle.name
    try:
        model = WhisperModel(args.model, device=os.getenv('NAT_AI_STT_DEVICE', 'cpu'), compute_type=os.getenv('NAT_AI_STT_COMPUTE_TYPE', 'int8'))
        segment_list = list(model.transcribe(audio_path, language=args.language or None, vad_filter=True)[0])
        text = ' '.join(segment.text.strip() for segment in segment_list).strip()
        confidence = sum(max(0.0, min(1.0, float(__import__('math').exp(segment.avg_logprob)))) for segment in segment_list) / len(segment_list) if segment_list else 0.0
        minimum = float(os.getenv('NAT_AI_STT_MIN_CONFIDENCE', '0.35'))
        if confidence < minimum:
            text = ''
        print(json.dumps({'text': text, 'language': args.language, 'confidence': round(confidence, 4), 'vad_segments': len(segment_list)}, ensure_ascii=False))
    finally:
        os.unlink(audio_path)

if __name__ == '__main__': main()
