import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
    url?: string | null;
    fullName: string;
    onUpload: (url: string) => void;
    onRemove: () => void;
}

const AvatarUpload = ({ url, fullName, onUpload, onRemove }: AvatarUploadProps) => {
    const { user } = useAuth();
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const initials = fullName
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'UP';

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Debes seleccionar una imagen para subir.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const filePath = `${user?.id}/avatar-${Math.random()}.${fileExt}`;

            // Upload the file to Supabase storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get the public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            onUpload(publicUrl);
            toast.success('Imagen de perfil actualizada');
        } catch (error: any) {
            toast.error(error.message || 'Error al subir la imagen');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <Avatar className="h-24 w-24 border-2 border-background shadow-xl ring-1 ring-border transition-transform duration-300 group-hover:scale-[1.02]">
                    <AvatarImage src={url || undefined} className="object-cover" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                        {initials}
                    </AvatarFallback>
                </Avatar>
                
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={cn(
                        "absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer",
                        uploading && "opacity-100"
                    )}
                >
                    {uploading ? (
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                        <Camera className="h-6 w-6 text-white" />
                    )}
                </button>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                accept="image/*"
                className="hidden"
                disabled={uploading}
            />

            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="h-8 text-xs gap-1.5"
                >
                    <Camera className="h-3.5 w-3.5" /> Cambiar foto
                </Button>
                {url && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onRemove}
                        disabled={uploading}
                        className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                    >
                        <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </Button>
                )}
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                Sube una foto cuadrada de máximo 2MB
            </p>
        </div>
    );
};

export default AvatarUpload;
