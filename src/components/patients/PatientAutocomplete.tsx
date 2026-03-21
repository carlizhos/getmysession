import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

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

const PatientAutocomplete = ({ value, onSelect, placeholder = "Buscar paciente...", className }: PatientAutocompleteProps) => {
    const [open, setOpen] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPatientName, setSelectedPatientName] = useState('');

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
        setSearchQuery('');
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
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className={cn("relative flex items-center group", className)}>
                    <Input
                        value={selectedPatientName || searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSelectedPatientName(''); 
                            if (value) onSelect('', ''); 
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
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
    );
};

export default PatientAutocomplete;
