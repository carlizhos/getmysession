import { useAuth } from '@/contexts/AuthContext';

export const useOrganization = () => {
    const { 
        organization, 
        availableOrganizations, 
        refreshOrganization, 
        switchOrganization,
        loading 
    } = useAuth();
    
    return {
        organization,
        availableOrganizations,
        refresh: refreshOrganization,
        switch: switchOrganization,
        isLoading: loading,
        // Helper: Check if the user is an owner or admin of the current organization
        isAdmin: organization?.role === 'owner' || organization?.role === 'admin',
        isOwner: organization?.role === 'owner',
    };
};
