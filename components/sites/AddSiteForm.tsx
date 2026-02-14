import React, { useState } from "react";
import { useAddSite } from "../../hooks/useSites";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Label from "../ui/Label";
import { Loader2, AlertCircle } from "lucide-react";

interface AddSiteFormProps {
  onSuccess: () => void;
}

const AddSiteForm: React.FC<AddSiteFormProps> = ({ onSuccess }) => {
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");

  const addSiteMutation = useAddSite();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    addSiteMutation.mutate(
      {
        siteName,
        siteUrl,
        username: "", // Wordt later ingevuld via de flow
        password: "", // Wordt later ingevuld via de flow
      },
      {
        onSuccess: () => {
          onSuccess();
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {addSiteMutation.isError && (
        <div className="flex items-center p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p>{addSiteMutation.error.message}</p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="siteName">Site Naam</Label>
        <Input
          id="siteName"
          placeholder="Mijn WordPress Site"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="siteUrl">Site URL</Label>
        <Input
          id="siteUrl"
          type="url"
          placeholder="https://example.com"
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
          required
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={addSiteMutation.isPending}>
          {addSiteMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Toevoegen...
            </>
          ) : (
            "Site Toevoegen"
          )}
        </Button>
      </div>
    </form>
  );
};

export default AddSiteForm;
