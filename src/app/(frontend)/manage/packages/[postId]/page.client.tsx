"use client"

import { useState, useEffect } from "react"
import { User } from "@/payload-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Settings, 
  Eye, 
  Edit3, 
  Plus, 
  Trash2, 
  DollarSign,
  Package,
  Users,
  Calendar,
  Star,
  Loader2
} from 'lucide-react'
import { Mic, MicOff, Wand2 } from 'lucide-react'
import { useRevenueCat } from "@/providers/RevenueCat"
import { Purchases, type Package as RevenueCatPackage } from "@revenuecat/purchases-js"
import { 
  BASE_PACKAGE_TEMPLATES,
  getPackagesByCategory,
  createHostPackageConfig,
  getDisplayTitle,
  getDisplayDescription,
  getEffectiveMultiplier,
  getEffectiveFeatures,
  type HostPackageConfig,
  type BasePackageConfig,
  type PackageCategory
} from "@/lib/package-types"
import { useSpeechToText } from "@/hooks/useSpeechToText"

interface Props {
  user: User
}

interface PackagePreview {
  duration: number
  baseRate: number
  effectiveRate: number
  savings: number
  total: number
}

export default function ManagePackagesPage({ postId }: { postId: string }) {
  const { packages, loading, error, setPackages } = useHostPackages(postId);

  // Voice-driven suggestions state
  const [suggestText, setSuggestText] = useState('')
  const [suggestions, setSuggestions] = useState<typeof PACKAGE_TEMPLATES>([])
  const { startListening, stopListening, isListening, micError } = useSpeechToText({
    onInterim: (text) => setSuggestText(text),
    onFinal: (text) => {
      setSuggestText(text)
      handleSuggest(text)
    },
  })

  // Add or update a package
  const upsertPackage = async (template: any, updates: any = {}) => {
    const existing = packages.find(p => p.revenueCatId === template.revenueCatId);
    if (existing) {
      // Update
      const res = await fetch(`/api/packages/${existing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      setPackages(pkgs => pkgs.map(p => p.id === updated.id ? updated : p));
    } else {
      // Create
      const res = await fetch(`/api/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post: postId,
          name: template.defaultName,
          revenueCatId: template.revenueCatId,
          isEnabled: true,
          ...updates,
        }),
      });
      const created = await res.json();
      setPackages(pkgs => [...pkgs, created]);
    }
  };

  const getSuggestionsFromText = (text: string) => {
    const t = text.toLowerCase()
    const picks = new Set<string>()
    if (/\bweek(ly)?\b/.test(t)) picks.add('weekly_customer')
    if (/(three|3).*night|night(s)?.*(three|3)/.test(t)) picks.add('three_nights_customer')
    if (/\bluxury\b/.test(t)) picks.add('per_night_luxury')
    if (/per night|nightly|\bnight(s)?\b/.test(t)) picks.add('per_night_customer')
    const list = PACKAGE_TEMPLATES.filter(tpl => picks.has(tpl.revenueCatId))
    return list.length > 0 ? list : PACKAGE_TEMPLATES.filter(tpl => tpl.revenueCatId === 'per_night_customer')
  }

  const handleSuggest = (text: string) => {
    setSuggestions(getSuggestionsFromText(text))
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading packages...</span>
      </div>
    );
  }
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Manage Packages</h1>

      {/* Voice-assisted suggestions */}
      <div className="mb-6">
        <div className="flex gap-2">
          <Input
            placeholder="Describe the package(s) you want (e.g. 'weekly stay with a luxury option')"
            value={suggestText}
            onChange={(e) => setSuggestText(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            size="icon"
            variant={isListening ? 'destructive' : 'outline'}
            onClick={isListening ? stopListening : startListening}
            title={micError || (isListening ? 'Stop listening' : 'Speak your needs')}
            disabled={!!micError}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button type="button" onClick={() => handleSuggest(suggestText)}>
            <Wand2 className="h-4 w-4 mr-2" />
            Suggest
          </Button>
        </div>
        {micError && <p className="text-sm text-destructive mt-2">{micError}</p>}
        {suggestions.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.map((t) => {
              const existing = packages.find(p => p.revenueCatId === t.revenueCatId)
              return (
                <Card key={`suggest-${t.revenueCatId}`} className="p-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{t.defaultName}</div>
                      <div className="text-xs text-muted-foreground">{t.revenueCatId}</div>
                    </div>
                    <div className="ml-auto">
                      {existing ? (
                        <Badge>Already added</Badge>
                      ) : (
                        <Button size="sm" onClick={() => upsertPackage(t)}>
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PACKAGE_TEMPLATES.map(template => {
          const pkg = packages.find(p => p.revenueCatId === template.revenueCatId);
          return (
            
            <Card key={template.revenueCatId}>
              <CardHeader>
                <CardTitle>{pkg?.name || template.defaultName}</CardTitle>
                <CardDescription>
                  RevenueCat Product: <span className="font-mono">{template.revenueCatId}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Display Name</label>
                  <div className="flex gap-2">
                    <Input
                      value={pkg?.name || template.defaultName}
                      onChange={e => upsertPackage(template, { name: e.target.value })}
                      disabled={!pkg}
                    />
                    {/* Optional quick mic to rename via voice */}
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => handleSuggest((pkg?.name || template.defaultName))}
                      title="Suggest related packages from this name"
                    >
                      <Wand2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id={`enabled-${template.revenueCatId}`}
                    checked={!!pkg?.isEnabled}
                    onCheckedChange={checked => upsertPackage(template, { isEnabled: checked })}
                    disabled={!pkg}
                  />
                  <label htmlFor={`enabled-${template.revenueCatId}`}>Enabled</label>
                </div>
              </CardContent>
              <CardFooter>
                {!pkg && (
                  <Button onClick={() => upsertPackage(template)}>
                    Add Package
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function useHostPackages(postId: string) {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    fetch(`/api/packages?where[post][equals]=${postId}`)
      .then(res => res.json())
      .then(data => {
        setPackages(data.docs || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load packages');
        setLoading(false);
      });
  }, [postId]);

  return { packages, loading, error, setPackages };
}

const PACKAGE_TEMPLATES = [
  { revenueCatId: 'per_night_customer', defaultName: 'Per Night (Customer)' },
  { revenueCatId: 'weekly_customer', defaultName: 'Weekly (Customer)' },
  { revenueCatId: 'three_nights_customer', defaultName: '3 Nights (Customer)' },
  { revenueCatId: 'per_night_luxury', defaultName: 'Per Night (Luxury)' },
  // ...add all your templates
]; 