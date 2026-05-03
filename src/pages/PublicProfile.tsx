import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, 
    Calendar, 
    GraduationCap, 
    Award, 
    Briefcase, 
    ChevronRight, 
    Instagram, 
    Linkedin, 
    Facebook,
    Quote,
    MapPin,
    Clock,
    Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpecialistProfile {
    id: string;
    full_name: string;
    avatar_url: string | null;
    prefix: string | null;
    bio: string | null;
    experience_years: number;
    institucion_formadora: string | null;
    telefono_profesional: string | null;
    cedulas: any[];
    cursos: any[];
    slug: string;
    is_public: boolean;
    social_links: {
        instagram?: string;
        linkedin?: string;
        facebook?: string;
    } | null;
}

const PublicProfile = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<SpecialistProfile | null>(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!slug) return;
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('slug', slug)
                    .eq('is_public', true)
                    .single();

                if (error || !data) {
                    setNotFound(true);
                } else {
                    setProfile(data);
                }
            } catch (err) {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                    <p className="text-sm text-muted-foreground animate-pulse font-medium">Cargando perfil...</p>
                </div>
            </div>
        );
    }

    if (notFound || !profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFCFB] p-4 text-center">
                <div className="max-w-md space-y-6">
                    <div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                        <User className="h-10 w-10 text-primary/40" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight">Perfil no encontrado</h1>
                        <p className="text-muted-foreground">El enlace que seguiste no es válido o el perfil ya no es público.</p>
                    </div>
                    <Button variant="zen" onClick={() => navigate('/')}>
                        Volver al inicio
                    </Button>
                </div>
            </div>
        );
    }

    const displayName = `${profile.prefix && profile.prefix !== 'none' ? profile.prefix + ' ' : ''}${profile.full_name}`;

    return (
        <div className="min-h-screen bg-[#FDFCFB] selection:bg-primary/10">
            {/* Header / Banner Area */}
            <div className="relative h-48 md:h-64 bg-gradient-to-br from-[#E8F3F1] via-[#F3F8F7] to-[#FDFCFB]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-60" />
            </div>

            <div className="max-w-4xl mx-auto px-4 -mt-24 md:-mt-32 relative pb-20">
                {/* Profile Main Card */}
                <Card className="border-none shadow-premium bg-white/80 backdrop-blur-xl overflow-hidden rounded-[2rem]">
                    <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                            {/* Left Side: Avatar & Basic Info */}
                            <div className="w-full md:w-80 bg-primary/5 p-8 flex flex-col items-center text-center space-y-6 border-b md:border-b-0 md:border-r border-primary/10">
                                <Avatar className="h-40 w-40 border-4 border-white shadow-elevated ring-1 ring-primary/10">
                                    <AvatarImage src={profile.avatar_url || ''} alt={profile.full_name} className="object-cover" />
                                    <AvatarFallback className="bg-primary/10 text-primary text-4xl font-serif">
                                        {profile.full_name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="space-y-2">
                                    <h1 className="text-2xl font-serif font-bold text-slate-800 leading-tight">
                                        {displayName}
                                    </h1>
                                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10 border-none px-3 py-1">
                                        Psicólogo Especialista
                                    </Badge>
                                </div>

                                <div className="w-full space-y-4 pt-4">
                                    <Button 
                                        className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 shadow-md hover:shadow-lg transition-all group"
                                        onClick={() => navigate(`/reservar/${profile.slug}`)}
                                    >
                                        Agendar Cita
                                        <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                    
                                    <div className="flex justify-center gap-4">
                                        {profile.social_links?.instagram && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-10 w-10 rounded-full text-slate-400 hover:text-pink-500 hover:bg-pink-50 transition-colors"
                                                onClick={() => {
                                                    const url = profile.social_links?.instagram;
                                                    window.open(url?.startsWith('http') ? url : `https://instagram.com/${url}`, '_blank');
                                                }}
                                            >
                                                <Instagram className="h-5 w-5" />
                                            </Button>
                                        )}
                                        {profile.social_links?.linkedin && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-10 w-10 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                onClick={() => {
                                                    const url = profile.social_links?.linkedin;
                                                    window.open(url?.startsWith('http') ? url : `https://linkedin.com/in/${url}`, '_blank');
                                                }}
                                            >
                                                <Linkedin className="h-5 w-5" />
                                            </Button>
                                        )}
                                        {profile.social_links?.facebook && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-10 w-10 rounded-full text-slate-400 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                                                onClick={() => {
                                                    const url = profile.social_links?.facebook;
                                                    window.open(url?.startsWith('http') ? url : `https://facebook.com/${url}`, '_blank');
                                                }}
                                            >
                                                <Facebook className="h-5 w-5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="w-full pt-6 border-t border-primary/10 space-y-3">
                                    <div className="flex items-center gap-3 text-slate-600">
                                        <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                                            <Briefcase className="h-4 w-4 text-primary/60" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Experiencia</p>
                                            <p className="text-sm font-semibold">{profile.experience_years || 0} años</p>
                                        </div>
                                    </div>
                                    {profile.telefono_profesional && (
                                        <div className="flex items-center gap-3 text-slate-600">
                                            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                                                <Phone className="h-4 w-4 text-primary/60" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Contacto</p>
                                                <p className="text-sm font-semibold">{profile.telefono_profesional}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Side: Detailed Bio & Certs */}
                            <div className="flex-1 p-8 md:p-12 space-y-10 bg-white/50">
                                {/* Bio Section */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary/60">
                                        <Quote className="h-5 w-5 fill-current" />
                                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Sobre mí</h2>
                                    </div>
                                    <div className="prose prose-slate max-w-none">
                                        <p className="text-slate-600 leading-relaxed text-lg italic font-light">
                                            {profile.bio || "No se ha proporcionado una biografía profesional."}
                                        </p>
                                    </div>
                                </section>

                                {/* Education Section */}
                                <section className="space-y-6">
                                    <div className="flex items-center gap-2">
                                        <div className="h-1 w-8 bg-primary/20 rounded-full" />
                                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Formación Académica</h2>
                                    </div>
                                    
                                    <div className="grid gap-6">
                                        {profile.institucion_formadora && (
                                            <div className="flex gap-4 group">
                                                <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                                                    <GraduationCap className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-800">Institución Formadora</h3>
                                                    <p className="text-slate-500 text-sm">{profile.institucion_formadora}</p>
                                                </div>
                                            </div>
                                        )}

                                        {profile.cedulas?.map((cedula: any, idx: number) => (
                                            <div key={idx} className="flex gap-4 group">
                                                <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                                                    <Award className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-800 capitalize">{cedula.tipo || 'Cédula Profesional'}</h3>
                                                    <p className="text-slate-500 text-sm">Cédula No. {cedula.numero} · {cedula.institucion}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Specialties/Courses */}
                                {profile.cursos && profile.cursos.length > 0 && (
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-2">
                                            <div className="h-1 w-8 bg-primary/20 rounded-full" />
                                            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Especialidades y Cursos</h2>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {profile.cursos.map((curso: any, idx: number) => (
                                                <Badge key={idx} variant="outline" className="px-4 py-2 rounded-full border-primary/10 bg-white text-slate-600 hover:bg-primary/5 transition-colors">
                                                    {curso.nombre} {curso.anio ? `(${curso.anio})` : ''}
                                                </Badge>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer Quote / Message */}
                <div className="mt-12 text-center space-y-4">
                    <p className="text-primary/40 font-serif text-3xl opacity-30">“</p>
                    <p className="text-slate-400 text-sm max-w-lg mx-auto font-medium">
                        Comprometido con la salud mental y el bienestar emocional de mis pacientes a través de un enfoque humano y profesional.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-8">
                        <div className="h-px w-8 bg-slate-200" />
                        <span className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">Saudade Health</span>
                        <div className="h-px w-8 bg-slate-200" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicProfile;
