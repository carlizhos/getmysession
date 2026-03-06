import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Check } from 'lucide-react';

interface SignaturePadProps {
    onSign: (dataUrl: string) => void;
    onClear?: () => void;
    disabled?: boolean;
    height?: number;
}

const SignaturePad = ({ onSign, onClear, disabled, height = 180 }: SignaturePadProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // Background blanco para PDF
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if ('touches' in e) {
            const touch = e.touches[0];
            return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
        }
        return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        if (disabled) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        setIsDrawing(true);
        lastPos.current = getPos(e, canvas);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || disabled) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx || !lastPos.current) return;
        const pos = getPos(e, canvas);
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        lastPos.current = pos;
        setHasSignature(true);
    };

    const stopDraw = () => {
        setIsDrawing(false);
        lastPos.current = null;
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        onClear?.();
    };

    const handleConfirm = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasSignature) return;
        onSign(canvas.toDataURL('image/png'));
    };

    return (
        <div className="space-y-2">
            <div className={`relative rounded-xl border-2 border-dashed transition-colors ${disabled ? 'opacity-60 bg-muted/30 border-border' : 'border-primary/30 bg-white hover:border-primary/60 cursor-crosshair'}`}>
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={height * 2}
                    style={{ width: '100%', height: `${height}px`, borderRadius: '10px', display: 'block' }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                />
                {!hasSignature && !disabled && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-sm text-muted-foreground select-none">Firma aquí con tu ratón o dedo</p>
                    </div>
                )}
            </div>
            <div className="flex gap-2 justify-end">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleClear}
                    disabled={disabled || !hasSignature}
                >
                    <Eraser className="h-3.5 w-3.5" />
                    Limpiar
                </Button>
                <Button
                    type="button"
                    variant="zen"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleConfirm}
                    disabled={disabled || !hasSignature}
                >
                    <Check className="h-3.5 w-3.5" />
                    Confirmar firma
                </Button>
            </div>
        </div>
    );
};

export default SignaturePad;
