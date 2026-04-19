import { useState, useEffect, useRef, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, X, Search, User, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { getAvatarTheme, getInitials } from '@/lib/avatar-utils';

interface Patient {
    id: string;
    name: string;
    email: string;
}

interface PatientAutocompleteProps {
    value: string;
    onSelect: (patientId: string, patientName: string) => void;
    placeholder?: string;
    className?: string;
}

const PatientAutocomplete = forwardRef<HTMLInputElement, PatientAutocompleteProps>(({ value, onSelect, placeholder = "Buscar paciente...", className }, ref) => {
    const [open, setOpen] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPatientName, setSelectedPatientName] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalResults, setModalResults] = useState<Patient[]>([]);

    // Cargar pacientes desde Supabase
    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const { data, error } = await supabase
                    .from('patients')
                    .select('id, name, email')
                    .order('name');

                if (error) throw error;
                setPatients(data || []);
            } catch (error) {
                console.error('Error al cargar pacientes:', error);
            }
        };

        fetchPatients();
    }, []);

    // Sincronizar el nombre cuando el valor cambia (útil para limpiar desde fuera)
    useEffect(() => {
        if (!value) {
            setSelectedPatientName('');
            setSearchQuery('');
        } else if (value && patients.length > 0) {
            const p = patients.find(p => p.id === value);
            if (p) setSelectedPatientName(p.name);
        }
    }, [value, patients]);

    // Filtrar pacientes solo si hay al menos 3 letras
    const showSuggestions = searchQuery.trim().length >= 3;
    const filteredPatients = showSuggestions 
        ? patients.filter(patient =>
            (patient.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (patient.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
          )
        : [];

    const handleSelect = (patient: Patient) => {
        setSelectedPatientName(patient.name);
        onSelect(patient.id, patient.name);
        setOpen(false);
        setIsModalOpen(false);
        setSearchQuery('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = searchQuery.trim();
            if (query.length < 3) return;

            const results = patients.filter(patient =>
                (patient.name?.toLowerCase() || '').includes(query.toLowerCase()) ||
                (patient.email?.toLowerCase() || '').includes(query.toLowerCase())
            );

            if (results.length === 1) {
                handleSelect(results[0]);
            } else if (results.length > 1) {
                setModalResults(results);
                setIsModalOpen(true);
                setOpen(false);
            }
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedPatientName('');
        setSearchQuery('');
        onSelect('', '');
        setOpen(false);
    };

    let emptyMessage = "No se encontraron pacientes.";
    if (searchQuery.trim().length === 0) {
        emptyMessage = "Escribe al menos 3 letras para buscar un paciente...";
    } else if (searchQuery.trim().length < 3) {
        emptyMessage = "Sigue escribiendo para buscar...";
    }

    return (
        <>
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className={cn("relative flex items-center group", className)}>
                    <Input
                        ref={ref}
                        value={selectedPatientName || searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSelectedPatientName(''); 
                            if (value) onSelect('', ''); 
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="w-full pr-10"
                    />
                    {(selectedPatientName || searchQuery) && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted/50 flex items-center justify-center -translate-y-px"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent
                className="w-[400px] p-0"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <Command shouldFilter={false}>
                    <CommandList>
                        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                            {emptyMessage}
                        </CommandEmpty>
                        <CommandGroup>
                            {filteredPatients.map((patient) => (
                                <CommandItem
                                    key={patient.id}
                                    value={patient.name}
                                    onSelect={() => handleSelect(patient)}
                                    className="cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === patient.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{patient.name}</span>
                                        <span className="text-xs text-muted-foreground">{patient.email}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-card border-none shadow-2xl animate-in zoom-in-95 duration-200">
                <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary">
                        <Search className="h-5 w-5" />
                        Resultados de búsqueda
                    </DialogTitle>
                </DialogHeader>
                
                <div className="p-2 bg-muted/5">
                    <p className="px-4 py-2 text-sm text-muted-foreground italic">
                        Se encontraron {modalResults.length} pacientes que coinciden con "{searchQuery}"
                    </p>
                    
                    <ScrollArea className="h-[350px] w-full px-2 pb-2">
                        <div className="space-y-1">
                            {modalResults.map((patient) => (
                                <button
                                    key={patient.id}
                                    onClick={() => handleSelect(patient)}
                                    className="w-full text-left p-3 rounded-lg hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 transition-all group flex items-start gap-3 border border-transparent"
                                >
                                    <div className={cn(
                                        "h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                                        getAvatarTheme(patient.name)
                                    )}>
                                        {getInitials(patient.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors truncate">
                                            {patient.name}
                                        </h4>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Mail className="h-3 w-3" />
                                            {patient.email}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        Seleccionar
                                    </Button>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
                
                <div className="px-6 py-4 bg-muted/30 border-t flex justify-end">
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                        Cancelar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
});

export default PatientAutocomplete;
