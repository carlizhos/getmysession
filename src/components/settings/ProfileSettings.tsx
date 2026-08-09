import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileQuery, useUpdateProfileMutation } from '@/hooks/useSettingsData';
import AvatarUpload from '@/components/settings/AvatarUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { PhoneInput } from '@/components/ui/PhoneInput';
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Instagram, 
  Linkedin, 
  Facebook, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  Trash2, 
  Plus, 
  PenTool, 
  RotateCcw, 
  Eraser, 
  CheckCircle2, 
  Image as LucideImage, 
  Upload, 
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const PREFIJOS = [
  { value: 'none', label: 'Sin prefijo' },
  { value: 'Psic.', label: 'Psic.' },
  { value: 'Lic.', label: 'Lic.' },
  { value: 'Dr.', label: 'Dr.' },
  { value: 'Dra.', label: 'Dra.' },
  { value: 'Mtro.', label: 'Mtro.' },
  { value: 'Mtra.', label: 'Mtra.' },
  { value: 'Esp.', label: 'Esp.' },
];

const TIPOS_CEDULA = [
  { value: 'licenciatura', label: 'Licenciatura' },
  { value: 'especialidad', label: 'Especialidad' },
  { value: 'maestria', label: 'Maestría' },
  { value: 'doctorado', label: 'Doctorado' },
  { value: 'otro', label: 'Otro' },
];

interface Cedula {
  id: string;
  numero: string;
  tipo: string;
  institucion: string;
}

interface Curso {
  id: string;
  nombre: string;
  institucion: string;
  anio: string;
}

export default function ProfileSettings() {
  const { user } = useAuth();
  const { data: profileData, isLoading, refetch } = useProfileQuery(user?.id);
  const updateProfileMutation = useUpdateProfileMutation();

  const [profile, setProfile] = useState({
    prefix: 'none',
    full_name: '',
    email: '',
    avatar_url: null as string | null,
    institucion_formadora: '',
    telefono_profesional: '',
    porcentaje_consultorio: 30,
    stripe_fee_percent: 5.14,
    slug: '',
    is_public: false,
    signature_data: null as string | null,
    logo_data: null as string | null,
    bio: '',
    experience_years: 0,
    social_links: { instagram: '', linkedin: '', facebook: '' } as Record<string, string>,
    reschedule_policy_hours: 24,
  });

  const [originalSlug, setOriginalSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);

  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isSigDrawing, setIsSigDrawing] = useState(false);
  const [hasSigContent, setHasSigContent] = useState(false);
  const sigLastPos = useRef<{ x: number; y: number } | null>(null);

  const [cedulas, setCedulas] = useState<Cedula[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);

  const newCedulaDefault = (): Cedula => ({ id: crypto.randomUUID(), numero: '', tipo: 'licenciatura', institucion: '' });
  const newCursoDefault = (): Curso => ({ id: crypto.randomUUID(), nombre: '', institucion: '', anio: '' });

  const [newCedula, setNewCedula] = useState<Cedula>(newCedulaDefault());
  const [newCurso, setNewCurso] = useState<Curso>(newCursoDefault());
  const [showAddCedula, setShowAddCedula] = useState(false);
  const [showAddCurso, setShowAddCurso] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profileData) {
      setProfile({
        prefix: profileData.prefix || 'none',
        full_name: profileData.full_name || '',
        email: user?.email || '',
        avatar_url: profileData.avatar_url || null,
        institucion_formadora: profileData.institucion_formadora || '',
        telefono_profesional: profileData.telefono_profesional || '',
        porcentaje_consultorio: profileData.porcentaje_consultorio ?? 30,
        stripe_fee_percent: profileData.stripe_fee_percent ?? 5.14,
        slug: profileData.slug || '',
        is_public: profileData.is_public || false,
        signature_data: profileData.signature_data || null,
        logo_data: profileData.logo_data || null,
        bio: profileData.bio || '',
        experience_years: profileData.experience_years || 0,
        social_links: profileData.social_links || { instagram: '', linkedin: '', facebook: '' },
        reschedule_policy_hours: profileData.reschedule_policy_hours ?? 24,
      });
      setOriginalSlug(profileData.slug || '');

      if (Array.isArray(profileData.cedulas)) setCedulas(profileData.cedulas);
      if (Array.isArray(profileData.cursos)) setCursos(profileData.cursos);
    }
  }, [profileData, user]);

  // Slug check
  useEffect(() => {
    const checkSlug = async () => {
      if (!profile.slug || profile.slug === originalSlug) {
        setSlugStatus('idle');
        setSlugSuggestions([]);
        return;
      }

      setSlugStatus('checking');
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('slug', profile.slug)
          .neq('id', user?.id)
          .maybeSingle();

        if (data) {
          setSlugStatus('taken');
          const suggestions = [
            `${profile.slug}-${Math.floor(Math.random() * 99)}`,
            `${profile.slug}-psic`,
            `${profile.slug}-prof`
          ];
          setSlugSuggestions(suggestions);
        } else {
          setSlugStatus('available');
          setSlugSuggestions([]);
        }
      } catch (err) {
        console.error(err);
      }
    };

    const timer = setTimeout(checkSlug, 500);
    return () => clearTimeout(timer);
  }, [profile.slug, originalSlug, user?.id]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato no válido. Solo se permiten imágenes PNG, JPG, JPEG o WEBP.');
      return;
    }

    const maxSize = 1 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('La imagen supera el tamaño máximo permitido de 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        setProfile(prev => ({ ...prev, logo_data: result }));
        toast.success('Logotipo cargado con éxito. Recuerda guardar tu perfil.');
      };
      img.onerror = () => {
        toast.error('La imagen está dañada o no es válida.');
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSavePerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (slugStatus === 'taken') {
      toast.error('El nombre de enlace ya está ocupado. Por favor elige otro.');
      return;
    }

    setSaved(false);
    try {
      await updateProfileMutation.mutateAsync({
        userId: user.id,
        data: {
          prefix: profile.prefix === 'none' ? null : profile.prefix,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          cedulas: cedulas,
          cursos: cursos,
          institucion_formadora: profile.institucion_formadora || null,
          telefono_profesional: profile.telefono_profesional || null,
          slug: profile.slug || null,
          is_public: profile.is_public,
          signature_data: profile.signature_data,
          logo_data: profile.logo_data,
          bio: profile.bio || null,
          experience_years: profile.experience_years || 0,
          social_links: profile.social_links || {},
        }
      });
      setOriginalSlug(profile.slug);
      setSaved(true);
      toast.success('Perfil guardado');
      setTimeout(() => setSaved(false), 3000);
      refetch();
    } catch (err) {
      toast.error('Error al guardar perfil');
    }
  };

  const addCedula = () => {
    if (!newCedula.numero.trim()) { toast.error('Ingresa el número de cédula'); return; }
    setCedulas(prev => [...prev, { ...newCedula, id: crypto.randomUUID() }]);
    setNewCedula(newCedulaDefault());
    setShowAddCedula(false);
  };
  const removeCedula = (id: string) => setCedulas(prev => prev.filter(c => c.id !== id));

  const addCurso = () => {
    if (!newCurso.nombre.trim()) { toast.error('Ingresa el nombre del curso o especialidad'); return; }
    setCursos(prev => [...prev, { ...newCurso, id: crypto.randomUUID() }]);
    setNewCurso(newCursoDefault());
    setShowAddCurso(false);
  };
  const removeCurso = (id: string) => setCursos(prev => prev.filter(c => c.id !== id));

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Card variant="flat" className="border border-border animate-in fade-in slide-in-from-bottom-2 duration-500">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Perfil Profesional</CardTitle>
              <CardDescription>
                Datos requeridos por <span className="text-primary font-medium">NOM-024-SSA3-2012</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center pb-8 border-b border-border/50 mb-6">
            <AvatarUpload
              url={profile.avatar_url}
              fullName={profile.full_name}
              onUpload={(url) => setProfile({ ...profile, avatar_url: url })}
              onRemove={() => setProfile({ ...profile, avatar_url: null })}
            />
          </div>

          <form onSubmit={handleSavePerfil} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre completo</Label>
              <div className="flex gap-2">
                <Select
                  value={profile.prefix}
                  onValueChange={(v) => setProfile({ ...profile, prefix: v })}
                  disabled={updateProfileMutation.isLoading}
                >
                  <SelectTrigger className="w-[120px] shrink-0">
                    <SelectValue placeholder="Prefijo" />
                  </SelectTrigger>
                  <SelectContent>
                    {PREFIJOS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Juan Pérez López"
                  disabled={updateProfileMutation.isLoading}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                value={profile.email}
                readOnly
                disabled
                className="bg-muted/50 text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">El correo se gestiona desde tu proveedor de autenticación.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="telefono_profesional" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" /> Teléfono profesional
                </Label>
                <PhoneInput
                  id="telefono_profesional"
                  value={profile.telefono_profesional}
                  onChange={(fullFormatted) => setProfile({ ...profile, telefono_profesional: fullFormatted })}
                  disabled={updateProfileMutation.isLoading}
                />
                <p className="text-[11px] text-muted-foreground">
                  Se usa en tus recetas médicas, expedientes PDF y para contacto profesional directo.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience_years" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" /> Años de experiencia
                </Label>
                <Input
                  id="experience_years"
                  type="number"
                  min={0}
                  max={60}
                  value={profile.experience_years}
                  onChange={(e) => setProfile({ ...profile, experience_years: parseInt(e.target.value) || 0 })}
                  placeholder="Ej: 10"
                  disabled={updateProfileMutation.isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="flex items-center justify-between">
                <span>Biografía Profesional</span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Perfil Público</span>
              </Label>
              <Textarea
                id="bio"
                rows={4}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Describe tu enfoque terapéutico, especialidades y trayectoria..."
                className="resize-none"
                disabled={updateProfileMutation.isLoading}
              />
              <p className="text-[11px] text-muted-foreground">Esta información será visible en tu página de perfil profesional.</p>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest flex items-center gap-2">
                Redes Sociales <span className="text-primary/40">(Opcional)</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Instagram */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    <span className="text-xs font-medium">Instagram</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={profile.social_links?.instagram || ''}
                      onChange={(e) => setProfile({
                        ...profile,
                        social_links: { ...profile.social_links, instagram: e.target.value }
                      })}
                      placeholder="usuario"
                      className="h-9 text-sm"
                    />
                    <div className="flex gap-1 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => {
                              const val = profile.social_links?.instagram;
                              if (!val) return;
                              const url = val.startsWith('http') ? val : `https://instagram.com/${val}`;
                              navigator.clipboard.writeText(url);
                              toast.success('Enlace de Instagram copiado');
                            }}
                            disabled={!profile.social_links?.instagram}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar enlace</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              const val = profile.social_links?.instagram;
                              if (!val) return;
                              const url = val.startsWith('http') ? val : `https://instagram.com/${val}`;
                              window.open(url, '_blank');
                            }}
                            disabled={!profile.social_links?.instagram}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Probar enlace</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                {/* LinkedIn */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Linkedin className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium">LinkedIn</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={profile.social_links?.linkedin || ''}
                      onChange={(e) => setProfile({
                        ...profile,
                        social_links: { ...profile.social_links, linkedin: e.target.value }
                      })}
                      placeholder="perfil-url"
                      className="h-9 text-sm"
                    />
                    <div className="flex gap-1 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => {
                              const val = profile.social_links?.linkedin;
                              if (!val) return;
                              const url = val.startsWith('http') ? val : `https://linkedin.com/in/${val}`;
                              navigator.clipboard.writeText(url);
                              toast.success('Enlace de LinkedIn copiado');
                            }}
                            disabled={!profile.social_links?.linkedin}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar enlace</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              const val = profile.social_links?.linkedin;
                              if (!val) return;
                              const url = val.startsWith('http') ? val : `https://linkedin.com/in/${val}`;
                              window.open(url, '_blank');
                            }}
                            disabled={!profile.social_links?.linkedin}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Probar enlace</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                {/* Facebook */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Facebook className="h-4 w-4 text-blue-800" />
                    <span className="text-xs font-medium">Facebook</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={profile.social_links?.facebook || ''}
                      onChange={(e) => setProfile({
                        ...profile,
                        social_links: { ...profile.social_links, facebook: e.target.value }
                      })}
                      placeholder="nombre-usuario"
                      className="h-9 text-sm"
                    />
                    <div className="flex gap-1 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => {
                              const val = profile.social_links?.facebook;
                              if (!val) return;
                              const url = val.startsWith('http') ? val : `https://facebook.com/${val}`;
                              navigator.clipboard.writeText(url);
                              toast.success('Enlace de Facebook copiado');
                            }}
                            disabled={!profile.social_links?.facebook}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar enlace</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              const val = profile.social_links?.facebook;
                              if (!val) return;
                              const url = val.startsWith('http') ? val : `https://facebook.com/${val}`;
                              window.open(url, '_blank');
                            }}
                            disabled={!profile.social_links?.facebook}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Probar enlace</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Perfil Público */}
            <div className="pt-2 space-y-6">
              <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                      Perfil y Presencia Pública
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Habilita tu perfil profesional y permite que tus pacientes agenden directamente.</p>
                  </div>
                  <Switch
                    checked={profile.is_public}
                    onCheckedChange={(c) => setProfile({ ...profile, is_public: c })}
                    disabled={updateProfileMutation.isLoading}
                  />
                </div>

                <div className={cn("space-y-3 transition-all", !profile.is_public && "opacity-50 pointer-events-none")}>
                  <Label htmlFor="slug">Tu enlace personalizado</Label>
                  <div className="flex gap-2">
                    <div className="flex flex-1 rounded-md shadow-sm relative">
                      <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-muted px-3 text-muted-foreground text-[10px] md:text-sm">
                        app.getmysession.mx/reservar/
                      </span>
                      <Input
                        id="slug"
                        className={cn(
                          "rounded-none rounded-r-md",
                          slugStatus === 'available' && "border-success focus-visible:ring-success/20",
                          slugStatus === 'taken' && "border-destructive focus-visible:ring-destructive/20",
                          originalSlug && "bg-muted/30 cursor-not-allowed opacity-80"
                        )}
                        placeholder="tu-nombre"
                        value={profile.slug}
                        onChange={(e) => setProfile({ ...profile, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        disabled={updateProfileMutation.isLoading || !profile.is_public || !!originalSlug}
                      />
                      {slugStatus === 'checking' && (
                        <div className="absolute right-12 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          onClick={() => {
                            const url = `https://app.getmysession.mx/reservar/${profile.slug}`;
                            navigator.clipboard.writeText(url);
                            toast.success('Enlace copiado');
                          }}
                          disabled={!profile.is_public || !profile.slug || slugStatus === 'taken'}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar enlace directo</TooltipContent>
                    </Tooltip>
                  </div>
                  
                  {slugStatus === 'taken' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <p className="text-xs text-destructive font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Este nombre ya está ocupado.
                      </p>
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Sugerencias:</span>
                        {slugSuggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setProfile({ ...profile, slug: s })}
                            className="text-[10px] px-2 py-1 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 rounded-full transition-colors font-medium"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {slugStatus === 'available' && (
                    <p className="text-xs text-success font-medium flex items-center gap-1 animate-in fade-in duration-200">
                      <CheckCircle2 className="h-3 w-3" /> ¡Este nombre está disponible!
                    </p>
                  )}

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Usa letras minúsculas, números y guiones para personalizar tu URL.</p>
                    {originalSlug ? (
                      <p className="text-[10px] text-primary/60 font-medium flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Este enlace es permanente y no puede ser modificado.
                      </p>
                    ) : (
                      <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Una vez establecido, este enlace no podrá ser modificado.
                      </p>
                    )}
                  </div>
                </div>

                <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all", !profile.is_public && "opacity-50 pointer-events-none")}>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground">Enlace de Perfil</Label>
                    <div className="flex gap-1.5">
                      <div className="flex-1 text-[11px] bg-background border border-border rounded-md px-2 py-1.5 truncate">
                        app.getmysession.mx/perfil/{profile.slug || '...'}
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => {
                              const url = `https://app.getmysession.mx/perfil/${profile.slug}`;
                              navigator.clipboard.writeText(url);
                              toast.success('Enlace de perfil copiado');
                            }}
                            disabled={!profile.is_public || !profile.slug}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar enlace de perfil</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => window.open(`/perfil/${profile.slug}`, '_blank')}
                            disabled={!profile.is_public || !profile.slug}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver perfil público</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground">Enlace de Reservas</Label>
                    <div className="flex gap-1.5">
                      <div className="flex-1 text-[11px] bg-background border border-border rounded-md px-2 py-1.5 truncate">
                        app.getmysession.mx/reservar/{profile.slug || '...'}
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => {
                              const url = `https://app.getmysession.mx/reservar/${profile.slug}`;
                              navigator.clipboard.writeText(url);
                              toast.success('Enlace de reservas copiado');
                            }}
                            disabled={!profile.is_public || !profile.slug}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar enlace de reservas</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => window.open(`/reservar/${profile.slug}`, '_blank')}
                            disabled={!profile.is_public || !profile.slug}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ir al portal de reservas</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cédulas Profesionales */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Cédulas Profesionales (NOM-024 INT-04)
                </p>
                <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowAddCedula(v => !v)}>
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </Button>
              </div>

              {cedulas.length > 0 && (
                <div className="space-y-2">
                  {cedulas.map((c, i) => (
                    <div key={c.id || `cedula-${i}`} className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono font-semibold">{c.numero}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {TIPOS_CEDULA.find(t => t.value === c.tipo)?.label ?? c.tipo}
                          {c.institucion && <> · {c.institucion}</>}
                        </p>
                      </div>
                      <button type="button" onClick={() => removeCedula(c.id)} className="text-muted-foreground hover:text-destructive transition-colors mt-0.5">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {cedulas.length === 0 && !showAddCedula && (
                <p className="text-xs text-muted-foreground italic">Sin cédulas registradas.</p>
              )}

              {showAddCedula && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nueva cédula</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Número de cédula *</Label>
                      <Input
                        value={newCedula.numero}
                        onChange={e => setNewCedula({ ...newCedula, numero: e.target.value })}
                        placeholder="Ej: 1234567"
                        maxLength={20}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={newCedula.tipo} onValueChange={v => setNewCedula({ ...newCedula, tipo: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIPOS_CEDULA.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Institución que expide</Label>
                    <Input
                      value={newCedula.institucion}
                      onChange={e => setNewCedula({ ...newCedula, institucion: e.target.value })}
                      placeholder="Ej: UNAM, SEP, UAM..."
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddCedula(false)}>Cancelar</Button>
                    <Button type="button" variant="zen" size="sm" onClick={addCedula}>Agregar cédula</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Especialidades y Cursos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Especialidades y Cursos
                </p>
                <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowAddCurso(v => !v)}>
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </Button>
              </div>

              {cursos.length > 0 && (
                <div className="space-y-2">
                  {cursos.map((c, i) => (
                    <div key={c.id || `curso-${i}`} className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{c.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.institucion && <>{c.institucion}</>}
                          {c.anio && <> · {c.anio}</>}
                        </p>
                      </div>
                      <button type="button" onClick={() => removeCurso(c.id)} className="text-muted-foreground hover:text-destructive transition-colors mt-0.5">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {cursos.length === 0 && !showAddCurso && (
                <p className="text-xs text-muted-foreground italic">Sin especialidades o cursos registrados.</p>
              )}

              {showAddCurso && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nueva especialidad / curso</p>
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre *</Label>
                    <Input
                      value={newCurso.nombre}
                      onChange={e => setNewCurso({ ...newCurso, nombre: e.target.value })}
                      placeholder="Ej: Terapia Cognitivo-Conductual, Neuropsicología clínica..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Institución</Label>
                      <Input
                        value={newCurso.institucion}
                        onChange={e => setNewCurso({ ...newCurso, institucion: e.target.value })}
                        placeholder="Ej: UNAM, IMSS..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Año</Label>
                      <Input
                        value={newCurso.anio}
                        onChange={e => setNewCurso({ ...newCurso, anio: e.target.value })}
                        placeholder="Ej: 2023"
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddCurso(false)}>Cancelar</Button>
                    <Button type="button" variant="zen" size="sm" onClick={addCurso}>Agregar</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Firma Profesional */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <PenTool className="h-3.5 w-3.5 text-primary" />
                    Firma Profesional
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Se incluirá automáticamente en todos los reportes y expedientes generados.</p>
                </div>
              </div>

              {profile.signature_data ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl border-2 border-primary/20 bg-white p-4 group">
                    <img src={profile.signature_data} alt="Firma profesional" className="max-h-[120px] mx-auto" />
                    <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 bg-white/90 hover:bg-white"
                        onClick={() => setProfile({ ...profile, signature_data: null })}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Cambiar firma
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-center text-success font-medium uppercase tracking-widest flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Firma registrada
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`relative rounded-2xl border-2 border-dashed transition-colors border-primary/30 bg-white hover:border-primary/60 cursor-crosshair`}>
                    <canvas
                      ref={sigCanvasRef}
                      width={800}
                      height={300}
                      style={{ width: '100%', height: '150px', borderRadius: '14px', display: 'block' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const canvas = sigCanvasRef.current;
                        if (!canvas) return;
                        setIsSigDrawing(true);
                        const rect = canvas.getBoundingClientRect();
                        const scaleX = canvas.width / rect.width;
                        const scaleY = canvas.height / rect.height;
                        sigLastPos.current = { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
                      }}
                      onMouseMove={(e) => {
                        if (!isSigDrawing) return;
                        e.preventDefault();
                        const canvas = sigCanvasRef.current;
                        if (!canvas) return;
                        const ctx = canvas.getContext('2d');
                        if (!ctx || !sigLastPos.current) return;
                        const rect = canvas.getBoundingClientRect();
                        const scaleX = canvas.width / rect.width;
                        const scaleY = canvas.height / rect.height;
                        const pos = { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
                        ctx.beginPath();
                        ctx.moveTo(sigLastPos.current.x, sigLastPos.current.y);
                        ctx.lineTo(pos.x, pos.y);
                        ctx.strokeStyle = '#1a1a2e';
                        ctx.lineWidth = 2.5;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.stroke();
                        sigLastPos.current = pos;
                        setHasSigContent(true);
                      }}
                      onMouseUp={() => { setIsSigDrawing(false); sigLastPos.current = null; }}
                      onMouseLeave={() => { setIsSigDrawing(false); sigLastPos.current = null; }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        const canvas = sigCanvasRef.current;
                        if (!canvas) return;
                        setIsSigDrawing(true);
                        const rect = canvas.getBoundingClientRect();
                        const scaleX = canvas.width / rect.width;
                        const scaleY = canvas.height / rect.height;
                        const touch = e.touches[0];
                        sigLastPos.current = { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
                      }}
                      onTouchMove={(e) => {
                        if (!isSigDrawing) return;
                        e.preventDefault();
                        const canvas = sigCanvasRef.current;
                        if (!canvas) return;
                        const ctx = canvas.getContext('2d');
                        if (!ctx || !sigLastPos.current) return;
                        const rect = canvas.getBoundingClientRect();
                        const scaleX = canvas.width / rect.width;
                        const scaleY = canvas.height / rect.height;
                        const touch = e.touches[0];
                        const pos = { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
                        ctx.beginPath();
                        ctx.moveTo(sigLastPos.current.x, sigLastPos.current.y);
                        ctx.lineTo(pos.x, pos.y);
                        ctx.strokeStyle = '#1a1a2e';
                        ctx.lineWidth = 2.5;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.stroke();
                        sigLastPos.current = pos;
                        setHasSigContent(true);
                      }}
                      onTouchEnd={() => { setIsSigDrawing(false); sigLastPos.current = null; }}
                    />
                    {!hasSigContent && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-sm text-muted-foreground/50 select-none">Dibuja tu firma aquí</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={!hasSigContent}
                      onClick={() => {
                        const canvas = sigCanvasRef.current;
                        if (!canvas) return;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        setHasSigContent(false);
                      }}
                    >
                      <Eraser className="h-3.5 w-3.5" /> Limpiar
                    </Button>
                    <Button
                      type="button"
                      variant="zen"
                      size="sm"
                      className="gap-1.5"
                      disabled={!hasSigContent}
                      onClick={() => {
                        const canvas = sigCanvasRef.current;
                        if (!canvas || !hasSigContent) return;
                        setProfile({ ...profile, signature_data: canvas.toDataURL('image/png') });
                        toast.success('Firma capturada. Recuerda guardar tu perfil.');
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar firma
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Logotipo Personalizado / Consultorio */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <LucideImage className="h-3.5 w-3.5 text-primary" />
                  Logotipo Personalizado / Consultorio
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Sube tu logo para personalizar la cabecera de las recetas, reportes y expedientes clínicos generados.</p>
              </div>

              {profile.logo_data ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl border-2 border-primary/20 bg-white p-4 group max-w-[280px]">
                    <img src={profile.logo_data} alt="Logotipo personalizado" className="max-h-[80px] mx-auto object-contain" />
                    <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 bg-white/90 hover:bg-white text-xs"
                        onClick={() => setProfile({ ...profile, logo_data: null })}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Eliminar logo
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-success font-medium uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Logotipo activo
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-muted/10 p-6 text-center hover:bg-muted/20 transition-all relative max-w-[400px]">
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
                    <p className="text-xs font-semibold text-slate-700">Haz clic para subir tu logotipo</p>
                    <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG o WEBP. Máximo 1MB.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="zen" disabled={updateProfileMutation.isLoading} className="gap-2">
                {updateProfileMutation.isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                  : saved ? <><CheckCircle2 className="h-4 w-4" /> Guardado</>
                    : 'Guardar perfil'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
