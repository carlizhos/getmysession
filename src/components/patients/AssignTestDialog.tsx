import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { psychometricTests } from '@/lib/psychometricTests';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useOrganization } from '@/hooks/useOrganization';
import { Brain, Link as LinkIcon, Check, Copy, Loader2, AlertCircle } from 'lucide-react';

interface AssignTestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientId: string;
    patientName: string;
    onAssigned?: () => void;
}

const AssignTestDialog = ({ open, onOpenChange, patientId, patientName, onAssigned }: AssignTestDialogProps) => {
    const { organization } = useOrganization();
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);

    const handleAssign = async () => {
        if (!selectedTestId) return;
        
        setIsAssigning(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            const { data, error } = await supabase
                .from('patient_tests')
                .insert({
                    patient_id: patientId,
                    user_id: user?.id,
                    test_type: selectedTestId,
                    status: 'pending',
                    organization_id: organization?.id,
                })
                .select('token')
                .single();

            if (error) throw error;

            const link = `${window.location.origin}/t/${data.token}`;
            setGeneratedLink(link);
            toast.success('Prueba asignada correctamente');
            if (onAssigned) onAssigned();
        } catch (error: any) {
            console.error('Error al asignar prueba:', error);
            toast.error('Error: ' + error.message);
        } finally {
            setIsAssigning(false);
        }
    };

    const copyToClipboard = () => {
        if (!generatedLink) return;
        navigator.clipboard.writeText(generatedLink);
        toast.success('Enlace copiado al portapapeles');
    };

    const resetAndClose = () => {
        setGeneratedLink(null);
        setSelectedTestId(null);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={open ? (v) => !v && resetAndClose() : onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Asignar Nueva Prueba</DialogTitle>
                    <DialogDescription>
                        Selecciona una prueba psicométrica para {patientName}. Se generará un enlace privado para el paciente.
                    </DialogDescription>
                </DialogHeader>

                {!generatedLink ? (
                    <div className="py-6 space-y-4">
                        {Object.values(psychometricTests).map((test) => (
                            <div 
                                key={test.id}
                                onClick={() => setSelectedTestId(test.id)}
                                className={`p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex items-center gap-5 ${
                                    selectedTestId === test.id 
                                    ? 'border-primary bg-primary/10 shadow-lg ring-1 ring-primary/20 scale-[1.02]' 
                                    : 'border-muted hover:border-primary/20 hover:bg-muted/50'
                                }`}
                            >
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${
                                    selectedTestId === test.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                                }`}>
                                    <Brain className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className={`font-bold text-sm ${selectedTestId === test.id ? 'text-primary' : 'text-foreground'}`}>
                                        {test.name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                        {test.description}
                                    </p>
                                </div>
                                {selectedTestId === test.id && (
                                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white animate-in zoom-in-50 duration-300">
                                        <Check className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="relative overflow-hidden bg-primary/5 border border-primary/20 p-8 rounded-[2rem] text-center">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Check className="h-24 w-24 -mr-8 -mt-8" />
                            </div>
                            <div className="relative z-10">
                                <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-8 ring-primary/5">
                                    <Check className="h-8 w-8 text-primary" />
                                </div>
                                <h4 className="text-xl font-black text-primary tracking-tight">¡Enlace de Evaluación Listo!</h4>
                                <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto">
                                    Comparte este acceso seguro con {patientName} para iniciar su proceso.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2 px-1">
                                <LinkIcon className="h-3 w-3" /> Enlace de Acceso Directo
                            </label>
                            <div className="group relative flex items-center gap-2 bg-muted/40 p-4 rounded-2xl border border-border/60 hover:border-primary/40 transition-all">
                                <code className="text-[13px] font-mono truncate flex-1 text-primary/80 font-medium">
                                    {generatedLink}
                                </code>
                                <Button 
                                    size="sm" 
                                    variant="secondary" 
                                    className="h-10 px-4 rounded-xl gap-2 font-bold shadow-sm hover:shadow-md transition-all active:scale-95" 
                                    onClick={copyToClipboard}
                                >
                                    <Copy className="h-4 w-4" />
                                    Copiar
                                </Button>
                            </div>
                        </div>

                        <div className="bg-amber-50/50 border border-amber-200/50 p-5 rounded-2xl flex gap-4 items-start">
                            <div className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="space-y-1">
                                <h5 className="text-xs font-bold text-amber-900">Nota importante</h5>
                                <p className="text-[11px] text-amber-800/70 leading-relaxed font-medium">
                                    Este enlace es de uso único y privado. El sistema notificará automáticamente una vez que el paciente complete la evaluación.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-3 sm:gap-0 mt-4">
                    {!generatedLink ? (
                        <>
                            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">Cancelar</Button>
                            <Button 
                                variant="zen" 
                                disabled={!selectedTestId || isAssigning} 
                                onClick={handleAssign}
                                className="gap-2 rounded-xl h-12 px-8 font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                            >
                                {isAssigning && <Loader2 className="h-4 w-4 animate-spin" />}
                                {isAssigning ? 'Asignando...' : 'Generar Enlace'}
                            </Button>
                        </>
                    ) : (
                        <Button 
                            variant="outline" 
                            onClick={resetAndClose} 
                            className="w-full h-12 rounded-2xl font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 transition-all shadow-sm"
                        >
                            Listo
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AssignTestDialog;
