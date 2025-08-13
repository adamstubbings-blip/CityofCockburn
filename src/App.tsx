import React, { useEffect, useMemo, useState } from "react";
import localforage from "localforage";
import * as XLSX from "xlsx";
import { v4 as uuid } from "uuid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { MapPin, Camera, Upload, Download, Database, Building2, Trash2, Plus } from "lucide-react";

localforage.config({ name: "cockburn-inspection", storeName: "rbaudit" });

const DEFAULT_FUNCTIONAL_AREAS = [
  "EXTERNAL FABRIC","MAIN HALL/CLUBROOM","MULTI-PURPOSE AREA","CHILD ACTIVITY AREA",
  "CHANGEROOMS","KITCHENS","OFFICE/MEETING ROOMS","STORE - EXTERNAL","TOILETS - PUBLIC",
  "TOILETS - INTERNAL","PLANT ROOM","INTERNAL - GENERAL"
];

interface Building { id: string; name: string; address?: string; notes?: string; }
interface AssetRow {
  id: string; buildingId: string; buildingName: string; functionalArea: string;
  component: string; group: string; type: string; qty: string; unit: string;
  funcCond: number | ""; aesthCond: number | ""; defects: string; photoName: string;
  geoX: string; geoY: string; polygonId: string; isExisting: boolean;
}
interface CatalogueItem { component: string; group: string; type: string; }

const UNITS = ["No","m²","lm","m³","pair","set"];

async function registerSW(){ if("serviceWorker" in navigator){ try{ await navigator.serviceWorker.register("/sw.js"); } catch{} } }

export default function App() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [functionalAreas, setFunctionalAreas] = useState<string[]>(DEFAULT_FUNCTIONAL_AREAS);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [currentBuildingId, setCurrentBuildingId] = useState<string>("");
  const [importing, setImporting] = useState(false);

  useEffect(() => { (async () => {
    await registerSW();
    const [b,a,c,fa] = await Promise.all([
      localforage.getItem<Building[]>("buildings"),
      localforage.getItem<AssetRow[]>("assets"),
      localforage.getItem<CatalogueItem[]>("catalogue"),
      localforage.getItem<string[]>("functionalAreas"),
    ]);
    if (b) setBuildings(b);
    if (a) setAssets(a);
    if (c) setCatalogue(c);
    if (fa && fa.length) setFunctionalAreas(fa);
  })(); }, []);

  useEffect(() => { localforage.setItem("buildings", buildings); }, [buildings]);
  useEffect(() => { localforage.setItem("assets", assets); }, [assets]);
  useEffect(() => { localforage.setItem("catalogue", catalogue); }, [catalogue]);
  useEffect(() => { localforage.setItem("functionalAreas", functionalAreas); }, [functionalAreas]);

  const currentBuilding = useMemo(() => buildings.find(b => b.id === currentBuildingId) || null, [buildings, currentBuildingId]);
  const buildingAssets = useMemo(() => assets.filter(a => a.buildingId === currentBuildingId), [assets, currentBuildingId]);
  const progress = useMemo(() => {
    const total = buildingAssets.length; if (!total) return 0;
    const rated = buildingAssets.filter(a => Number(a.funcCond) >= 1 && Number(a.aesthCond) >= 1).length;
    return Math.round(100 * rated / total);
  }, [buildingAssets]);

  async function importBuildingsCSV(file: File) {
    const text = await file.text();
    // manual CSV parse to be safe
    const lines = text.split(/\r?\n/).filter(Boolean);
    const hdr = lines.shift()?.split(",") || [];
    const rows = lines.map(l => l.split(",").map(s => s.replace(/^"|"$/g,"").replace(/""/g,'"')));
    const idx = (name:string) => hdr.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());
    const bi = idx("BuildingID"); const bn = idx("BuildingName"); const ad = idx("Suburb")>=0?idx("Suburb"):idx("Address"); const no = idx("Notes");
    const mapped: Building[] = rows.map(r => ({
      id: String((bi>=0?r[bi]:"") || uuid()),
      name: String(bn>=0?r[bn]:""),
      address: String(ad>=0?r[ad]:""),
      notes: String(no>=0?r[no]:"")
    })).filter(b => b.name);
    setBuildings(mapped);
    if (mapped.length) setCurrentBuildingId(mapped[0].id);
  }

  async function importFromExcelTemplate(file: File) {
    setImporting(true);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const bws = wb.Sheets["Buildings"];
    if (bws) {
      const arr = XLSX.utils.sheet_to_json<any>(bws, { defval: "" });
      const bs: Building[] = arr.map((r:any) => ({ id: String(r.BuildingID||uuid()), name: String(r.BuildingName||""), address: String(r.Address||""), notes: String(r.Notes||"") }));
      if (bs.length) { setBuildings(bs); setCurrentBuildingId(bs[0].id); }
    }
    const fws = wb.Sheets["Lists_FunctionalAreas"];
    if (fws) {
      const arr = XLSX.utils.sheet_to_json<any>(fws, { header:1 }) as any[];
      const fas = arr.map(r => String(r[0]||"")).filter(Boolean);
      if (fas.length) setFunctionalAreas(fas);
    }
    const cws = wb.Sheets["Lists_Components_Detailed"] || wb.Sheets["Lists_Components"];
    if (cws) {
      const arr = XLSX.utils.sheet_to_json<any>(cws, { defval: "" });
      const cats: CatalogueItem[] = arr.filter((r:any)=> r["Building Component"]).map((r:any) => ({ component: String(r["Building Component"]).trim(), group: String(r["Asset Group"]).trim(), type: String(r["Asset Type"]).trim() }));
      if (cats.length) setCatalogue(cats);
    }
    setImporting(false);
  }

  function addAsset(existing: boolean) {
    if (!currentBuilding) return;
    const id = uuid();
    const base: AssetRow = {
      id, buildingId: currentBuilding.id, buildingName: currentBuilding.name,
      functionalArea: functionalAreas[0] || "", component: catalogue[0]?.component || "",
      group: catalogue[0]?.group || "", type: catalogue[0]?.type || "",
      qty: "", unit: UNITS[0], funcCond: "", aesthCond: "", defects: "",
      photoName: "", geoX: "", geoY: "", polygonId: "", isExisting: existing,
    };
    setAssets(a => [base, ...a]);
  }
  function updateAsset(id: string, patch: Partial<AssetRow>) { setAssets(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a)); }
  function removeAsset(id: string) { setAssets(prev => prev.filter(a => a.id !== id)); }
  function captureLocation(id: string) {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => { updateAsset(id, { geoX: String(pos.coords.longitude), geoY: String(pos.coords.latitude) }); });
  }
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>, id: string) {
    const f = e.target.files?.[0]; if (!f) return;
    const name = `${id}_${f.name}`;
    const b64 = await f.arrayBuffer().then(buf => {
      let binary = ""; const bytes = new Uint8Array(buf); const chunk=0x8000;
      for (let i=0;i<bytes.length;i+=chunk) { binary += String.fromCharCode.apply(null as any, bytes.subarray(i,i+chunk) as any); }
      return btoa(binary);
    });
    await localforage.setItem(`photo:${name}`, b64);
    updateAsset(id, { photoName: name });
  }

  function downloadBlob(filename: string, mime: string, data: BlobPart) {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportExcel() {
    const buildingsRows = buildings.map(b => ({ BuildingID: b.id, BuildingName: b.name, Address: b.address||"", Notes: b.notes||"" }));
    const toRow = (a: AssetRow) => ({
      BuildingID: a.buildingId, BuildingName: a.buildingName, FunctionalArea: a.functionalArea,
      BuildingComponent: a.component, AssetGroup: a.group, AssetType: a.type,
      QuantityOrArea: a.qty, Unit: a.unit,
      Condition_Functionality_1to5: a.funcCond, Condition_Aesthetics_1to5: a.aesthCond,
      Defects_Notes: a.defects, PhotoFilename: a.photoName, Geo_X: a.geoX, Geo_Y: a.geoY,
      FunctionalAreaPolygonID: a.polygonId,
    });
    const existingRows = assets.filter(a=>a.isExisting).map(toRow);
    const newRows = assets.filter(a=>!a.isExisting).map(toRow);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildingsRows), "Buildings");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(existingRows), "Assets_Existing");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(newRows), "Assets_New");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(functionalAreas.map(f=>[f])), "Lists_FunctionalAreas");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(catalogue.map(c => ({ "Building Component": c.component, "Asset Group": c.group, "Asset Type": c.type }))), "Lists_Components_Detailed");
    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    downloadBlob("Cockburn_Condition_Audit_Data.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out);
  }

  const BuildingPicker = () => (
    <div className="flex items-center gap-2 flex-wrap">
      <select className="w-[360px]" value={currentBuildingId} onChange={e=>setCurrentBuildingId(e.target.value)}>
        <option value="" disabled>Select building</option>
        {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <div className="text-sm text-slate-500">{currentBuilding?.address}</div>
    </div>
  );

  const AssetEditor: React.FC<{ row: AssetRow }> = ({ row }) => {
    const [catPick, setCatPick] = useState(`${row.component} | ${row.group} | ${row.type}`);
    const flat = useMemo(() => Array.from(new Set(catalogue.map(c => `${c.component} | ${c.group} | ${c.type}`))), [catalogue]);
    function applyCat(value: string) {
      setCatPick(value);
      const [component, group, type] = value.split(" | ").map(s=>s.trim());
      updateAsset(row.id, { component, group, type });
    }
    return (
      <div className="card mb-3">
        <div className="px-4 pt-4">
          <h3 className="text-base font-semibold flex items-center gap-2"><span className="badge">Asset #{row.id.slice(0,8)}</span></h3>
        </div>
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Functional Area</Label>
            <select className="w-full" value={row.functionalArea} onChange={e => updateAsset(row.id, { functionalArea: e.target.value })}>
              {functionalAreas.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Asset Type (Component | Group | Type)</Label>
            <select className="w-full" value={catPick} onChange={e => applyCat(e.target.value)}>
              <option value="">Pick asset</option>
              {flat.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <Label>Quantity/Area</Label>
            <Input value={row.qty} onChange={e => updateAsset(row.id, { qty: e.target.value })} />
          </div>
          <div>
            <Label>Unit</Label>
            <select className="w-full" value={row.unit} onChange={e => updateAsset(row.id, { unit: e.target.value })}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Condition – Functionality (1–5)</Label>
              <Input type="number" min={1} max={5} value={row.funcCond as any} onChange={e => updateAsset(row.id, { funcCond: e.target.value ? Number(e.target.value) : "" })} />
            </div>
            <div>
              <Label>Condition – Aesthetics (1–5)</Label>
              <Input type="number" min={1} max={5} value={row.aesthCond as any} onChange={e => updateAsset(row.id, { aesthCond: e.target.value ? Number(e.target.value) : "" })} />
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Defects / Notes</Label>
            <Textarea rows={3} value={row.defects} onChange={e => updateAsset(row.id, { defects: e.target.value })} />
          </div>
          <div className="flex items-end gap-3">
            <div>
              <Label>Photo</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept="image/*" capture="environment" onChange={e => handlePhoto(e, row.id)} />
                {row.photoName && <span className="text-xs text-slate-500">{row.photoName}</span>}
              </div>
            </div>
            <Button type="button" variant="secondary" onClick={() => captureLocation(row.id)} className="mt-6"><MapPin className="h-4 w-4 mr-2"/>GPS</Button>
            <Button type="button" variant="destructive" onClick={() => removeAsset(row.id)} className="mt-6"><Trash2 className="h-4 w-4 mr-2"/>Remove</Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Geo_X (lon)</Label>
              <Input value={row.geoX} onChange={e => updateAsset(row.id, { geoX: e.target.value })} />
            </div>
            <div>
              <Label>Geo_Y (lat)</Label>
              <Input value={row.geoY} onChange={e => updateAsset(row.id, { geoY: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>FunctionalAreaPolygonID</Label>
            <Input value={row.polygonId} onChange={e => updateAsset(row.id, { polygonId: e.target.value })} />
          </div>
        </div>
      </div>
    );
  };

  const existing = buildingAssets.filter(a => a.isExisting);
  const created = buildingAssets.filter(a => !a.isExisting);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Building2 className="h-6 w-6"/> Cockburn Inspection (iPad)</h1>
        <div className="flex gap-2">
          <Button onClick={exportExcel}><Download className="h-4 w-4 mr-2"/>Export Excel</Button>
        </div>
      </div>

      <div className="card">
        <div className="px-4 pb-4 pt-6 grid gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <BuildingPicker/>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Progress value={progress} className="w-[240px]"/>
              <span className="text-sm text-slate-500">{progress}% complete</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Label className="mr-2">Import:</Label>
            <label className="inline-flex items-center gap-2">
              <Input type="file" accept=".csv" onChange={e => e.target.files && importBuildingsCSV(e.target.files[0])} className="w-[240px]"/>
              <span className="text-sm text-slate-500">Buildings CSV</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <Input type="file" accept=".xlsx" onChange={e => e.target.files && importFromExcelTemplate(e.target.files[0])} className="w-[260px]"/>
              <span className="text-sm text-slate-500">Master Excel (lists & buildings)</span>
            </label>
            {importing && <span className="text-sm">Importing…</span>}
          </div>
        </div>
      </div>

      {currentBuilding && (
        <>
          <div className="flex gap-2 mb-3">
            <Button onClick={() => addAsset(true)}><Plus className="h-4 w-4 mr-2"/>Add Existing Asset</Button>
            <Button onClick={() => addAsset(false)} variant="secondary"><Plus className="h-4 w-4 mr-2"/>Add New Asset</Button>
          </div>

          <h2 className="text-lg font-semibold">Existing Assets ({existing.length})</h2>
          {existing.length === 0 && <div className="text-sm text-slate-500 mb-2">No existing assets recorded yet for this building.</div>}
          {existing.map(row => <AssetEditor key={row.id} row={row} />)}

          <h2 className="text-lg font-semibold mt-6">New / Missing Assets ({created.length})</h2>
          {created.length === 0 && <div className="text-sm text-slate-500">No new/missing assets logged yet.</div>}
          {created.map(row => <AssetEditor key={row.id} row={row} />)}
        </>
      )}

      {!currentBuilding && (
        <div className="card">
          <div className="px-4 pt-6 pb-4">
            <p className="text-sm text-slate-500">Import the Buildings CSV or the master Excel template to begin, then select a building.</p>
          </div>
        </div>
      )}

      <footer className="text-xs text-slate-500 pt-2">Data is saved offline on this iPad and can be exported to Excel at any time for Word report generation using your exporter script.</footer>
    </div>
  );
}
