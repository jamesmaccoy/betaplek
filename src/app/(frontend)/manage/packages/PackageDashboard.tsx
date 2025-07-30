"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Package {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  customName?: string;
  minNights: number;
  maxNights: number;
  revenueCatId?: string;
  baseRate?: number;
  category?: string;
  multiplier: number;
  features?: Array<{ feature: string }>;
}

interface PackageDashboardProps {
  postId: string;
}

export default function PackageDashboard({ postId }: PackageDashboardProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPackages = async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    
    try {
      // Load both packages and post data
      const [packagesRes, postRes] = await Promise.all([
        fetch(`/api/packages?where[post][equals]=${postId}`),
        fetch(`/api/posts/${postId}`)
      ]);

      if (!packagesRes.ok) throw new Error('Failed to load packages');
      if (!postRes.ok) throw new Error('Failed to load post data');

      const [packagesData, postData] = await Promise.all([
        packagesRes.json(),
        postRes.json()
      ]);

      const packages = packagesData.docs || [];
      const packageSettings = postData.doc?.packageSettings || [];
      
      // Create a map of package settings by package ID
      const settingsMap = new Map();
      packageSettings.forEach((setting: any) => {
        const pkgId = typeof setting.package === 'object' ? setting.package.id : setting.package;
        settingsMap.set(pkgId, setting);
      });
      
      setPackages(
        packages.map((pkg: any) => {
          const settings = settingsMap.get(pkg.id);
          return {
            id: pkg.id,
            name: pkg.name,
            description: pkg.description,
            isEnabled: settings?.enabled ?? pkg.isEnabled ?? true,
            customName: settings?.customName || pkg.name,
            minNights: pkg.minNights,
            maxNights: pkg.maxNights,
            revenueCatId: pkg.revenueCatId,
            baseRate: pkg.baseRate,
            category: pkg.category,
            multiplier: pkg.multiplier || 1,
            features: pkg.features || [],
          };
        })
      );
    } catch (err: any) {
      setError(err.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, [postId]);

  const handleToggle = (id: string) => {
    setPackages(pkgs =>
      pkgs.map(pkg =>
        pkg.id === id ? { ...pkg, isEnabled: !pkg.isEnabled } : pkg
      )
    );
  };

  const handleFieldChange = (id: string, field: keyof Package, value: any) => {
    setPackages(pkgs =>
      pkgs.map(pkg =>
        pkg.id === id ? { ...pkg, [field]: value } : pkg
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Save each package individually
      const updatePromises = packages.map(async (pkg) => {
        // Update the package record directly
        const packageUpdateRes = await fetch(`/api/packages/${pkg.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: pkg.name,
            description: pkg.description,
            multiplier: pkg.multiplier,
            category: pkg.category,
            minNights: pkg.minNights,
            maxNights: pkg.maxNights,
            baseRate: pkg.baseRate,
            isEnabled: pkg.isEnabled,
          }),
        });
        
        if (!packageUpdateRes.ok) {
          throw new Error(`Failed to update package ${pkg.name}`);
        }
        
        return packageUpdateRes.json();
      });
      
      await Promise.all(updatePromises);
      
      // Also update the post's packageSettings for custom names
      const postUpdateRes = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageSettings: packages.map(pkg => ({
            package: pkg.id,
            enabled: pkg.isEnabled,
            customName: pkg.customName,
          })),
        }),
      });
      
      if (!postUpdateRes.ok) throw new Error("Failed to save package settings");
      
      setSuccess("All package changes saved successfully!");
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncRevenueCat = async () => {
    setSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/packages/sync-revenuecat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      
      if (!res.ok) throw new Error('Failed to sync RevenueCat packages');
      
      const result = await res.json();
      setSuccess(`Successfully imported ${result.importedPackages?.length || 0} packages from RevenueCat`);
      
      // Reload packages after sync
      await loadPackages();
    } catch (e: any) {
      setError(e.message || 'Failed to sync RevenueCat packages');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center gap-2 py-10">
      <Loader2 className="h-5 w-5 animate-spin" />
      Loading packages...
    </div>
  );

  return (
    <div className="container py-10 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Packages</h1>
        <Button 
          onClick={handleSyncRevenueCat} 
          disabled={syncing}
          variant="outline"
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Sync RevenueCat
        </Button>
      </div>
      
      {error && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="mb-4">
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {packages.map(pkg => (
          <Card key={pkg.id} className="w-full">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Input
                      value={pkg.name}
                      onChange={e => handleFieldChange(pkg.id, 'name', e.target.value)}
                      className="font-semibold text-lg border-none p-0 h-auto bg-transparent"
                      disabled={!pkg.isEnabled}
                    />
                    {pkg.revenueCatId && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        RevenueCat
                      </span>
                    )}
                  </CardTitle>
                </div>
                <Switch checked={pkg.isEnabled} onCheckedChange={() => handleToggle(pkg.id)} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600">Description</label>
                <Textarea
                  value={pkg.description || ""}
                  onChange={e => handleFieldChange(pkg.id, 'description', e.target.value)}
                  disabled={!pkg.isEnabled}
                  className="mt-1"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Category</label>
                  <Select
                    value={pkg.category || 'standard'}
                    onValueChange={value => handleFieldChange(pkg.id, 'category', value)}
                    disabled={!pkg.isEnabled}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="hosted">Hosted</SelectItem>
                      <SelectItem value="addon">Add-on</SelectItem>
                      <SelectItem value="special">Special</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-600">Multiplier</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="3.0"
                    value={pkg.multiplier}
                    onChange={e => handleFieldChange(pkg.id, 'multiplier', parseFloat(e.target.value) || 1)}
                    disabled={!pkg.isEnabled}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Min Nights</label>
                  <Input
                    type="number"
                    min="1"
                    value={pkg.minNights}
                    onChange={e => handleFieldChange(pkg.id, 'minNights', parseInt(e.target.value) || 1)}
                    disabled={!pkg.isEnabled}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-600">Max Nights</label>
                  <Input
                    type="number"
                    min="1"
                    value={pkg.maxNights}
                    onChange={e => handleFieldChange(pkg.id, 'maxNights', parseInt(e.target.value) || 7)}
                    disabled={!pkg.isEnabled}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-600">Base Rate</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pkg.baseRate || ''}
                  onChange={e => handleFieldChange(pkg.id, 'baseRate', e.target.value ? parseFloat(e.target.value) : null)}
                  disabled={!pkg.isEnabled}
                  className="mt-1"
                  placeholder="Optional base rate override"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-600">Custom Display Name</label>
                <Input
                  value={pkg.customName || ""}
                  onChange={e => handleFieldChange(pkg.id, 'customName', e.target.value)}
                  disabled={!pkg.isEnabled}
                  className="mt-1"
                  placeholder="Override display name"
                />
              </div>
              
              {pkg.revenueCatId && (
                <div className="text-xs text-gray-400 mt-1">
                  RevenueCat ID: {pkg.revenueCatId}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {packages.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          <p>No packages found for this post.</p>
          <p className="text-sm mt-2">Click "Sync RevenueCat" to import packages from RevenueCat.</p>
        </div>
      )}
      
      <CardFooter className="justify-end mt-6">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save All Changes
        </Button>
      </CardFooter>
    </div>
  );
} 