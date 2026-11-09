import { Button, Label, SearchField } from "@heroui/react";
import { useState } from "react";

interface SearchOpportunitiesProps {
    onSearchHandler: (k: string) => void;
}

const SearchOpportunities = ({ onSearchHandler }: SearchOpportunitiesProps) => {
    const [searchTerm, setSearchTerm] = useState("");

    return (
        <SearchField
            name="search"
            className="mb-7 w-3/5 max-w-none"
            value={searchTerm}
            onChange={setSearchTerm}
            onSubmit={() => onSearchHandler(searchTerm)}
        >
            <Label className="mb-2">Buscar por nombre</Label>
            <div className="flex flex-row gap-4">
                <SearchField.Group className="w-7/8 min-h-10">
                    <SearchField.SearchIcon />
                    <SearchField.Input className="w-full" placeholder="Buscar oportunidades..." />
                    <SearchField.ClearButton />
                </SearchField.Group>
                <Button 
                    className="w-1/8 rounded-md bg-warning text-black min-h-10"
                    onClick={() => onSearchHandler(searchTerm)}
                >
                    Buscar
                </Button>
            </div>
            <Label className="text-muted text-xs font-light mt-2">Busca por el nombre completo o por una parte</Label>
        </SearchField>
    );
};

export default SearchOpportunities;