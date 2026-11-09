import { Button, Label, SearchField } from "@heroui/react";
import { useState } from "react";

interface SearchOpportunitiesProps {
  onSearchHandler: (term: string) => void;
}

const SearchOpportunities = ({ onSearchHandler }: SearchOpportunitiesProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="mb-7 w-3/5">
      <div className="flex flex-row items-end gap-4">
        <SearchField
          name="search"
          className="max-w-none flex-1"
          value={searchTerm}
          onChange={setSearchTerm}
          onSubmit={() => onSearchHandler(searchTerm)}
          onClear={() => onSearchHandler("")}
        >
          <Label className="mb-2">Buscar por nombre</Label>
          <SearchField.Group className="min-h-10 w-full">
            <SearchField.SearchIcon />
            <SearchField.Input className="w-full" placeholder="Buscar oportunidades..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <Button
          className="min-h-10 rounded-md bg-warning px-6 text-black"
          onPress={() => onSearchHandler(searchTerm)}
        >
          Buscar
        </Button>
      </div>

      <p className="mt-2 text-xs font-light text-muted">
        Busca por el nombre completo o por una parte
      </p>
    </div>
  );
};

export default SearchOpportunities;