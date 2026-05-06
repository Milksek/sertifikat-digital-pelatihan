"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Beaker, Clock, Database, Server, Zap } from "lucide-react";
export default function AdminDashboard() {
  const [gasStats, setGasStats] = useState<any>(null);
  const [verifyStats, setVerifyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: gasData } = await supabase.from("transaction_logs").select("*");
        const { data: verifyData } = await supabase.from("verification_logs").select("*");
        if (gasData && gasData.length > 0) {
          const avgGas = gasData.reduce((acc, curr) => acc + Number(curr.gas_used), 0) / gasData.length;
          const avgFee = gasData.reduce((acc, curr) => acc + Number(curr.total_fee_matic), 0) / gasData.length;
          setGasStats({
            count: gasData.length,
            avgGas: avgGas.toFixed(0),
            avgFeeMatic: avgFee.toFixed(6)
          });
        } else {
            setGasStats({count: 0, avgGas: 0, avgFeeMatic: 0});
        }
        if (verifyData && verifyData.length > 0) {
          const validLogs = verifyData.filter(l => l.total_time_ms);
          if (validLogs.length > 0) {
            const avgBc = validLogs.reduce((acc, curr) => acc + Number(curr.blockchain_time_ms || 0), 0) / validLogs.length;
            const avgIpfs = validLogs.reduce((acc, curr) => acc + Number(curr.ipfs_time_ms || 0), 0) / validLogs.length;
            const avgTotal = validLogs.reduce((acc, curr) => acc + Number(curr.total_time_ms || 0), 0) / validLogs.length;
            setVerifyStats({
              count: validLogs.length,
              avgBc: avgBc.toFixed(2),
              avgIpfs: avgIpfs.toFixed(2),
              avgTotal: avgTotal.toFixed(2)
            });
          } else {
            setVerifyStats({ count: 0, avgBc: 0, avgIpfs: 0, avgTotal: 0 });
          }
        } else {
          setVerifyStats({ count: 0, avgBc: 0, avgIpfs: 0, avgTotal: 0 });
        }
      } catch (err) {
        console.error("Gagal mengambil metrik:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Activity className="w-8 h-8 text-blue-600" /> Dashboard Evaluasi
        </h1>
        <p className="text-slate-500 mt-1">Pantau dan kelola data metrik evaluasi sistem terdesentralisasi Anda.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-blue-100 bg-blue-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Transaksi L2</CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{loading ? "..." : gasStats?.count}</div>
            <p className="text-xs text-blue-600 mt-1">Sertifikat di-mint</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 bg-emerald-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800">Rata-rata Biaya Gas</CardTitle>
            <Zap className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">{loading ? "..." : `${gasStats?.avgFeeMatic || 0} MATIC`}</div>
            <p className="text-xs text-emerald-600 mt-1">~ {gasStats?.avgGas} Gas limit used</p>
          </CardContent>
        </Card>
        <Card className="border-purple-100 bg-purple-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Kecepatan Verifikasi TTV</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{loading ? "..." : `${verifyStats?.avgTotal || 0} ms`}</div>
            <p className="text-xs text-purple-600 mt-1">Berdasarkan {verifyStats?.count} sampel scan</p>
          </CardContent>
        </Card>
      </div>
      <h2 className="text-xl font-semibold mt-8 border-b pb-2 flex items-center gap-2">
        <Server className="w-5 h-5" /> Metrik Dekomposisi Infrastruktur
      </h2>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Komponen</TableHead>
              <TableHead className="text-right">Rata-rata Waktu (ms)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">On-Chain Lookup (Polygon L2)</TableCell>
              <TableCell className="text-right">{loading ? "-" : verifyStats?.avgBc} ms</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">IPFS Node Fallback Latency</TableCell>
              <TableCell className="text-right">{loading ? "-" : verifyStats?.avgIpfs} ms</TableCell>
            </TableRow>
             <TableRow className="bg-slate-50/50">
              <TableCell className="font-bold">TOTAL RATA-RATA LATENSI SISTEM</TableCell>
              <TableCell className="font-bold text-xl text-right text-indigo-700">{loading ? "-" : verifyStats?.avgTotal} ms</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-800 flex gap-3">
         <Beaker className="w-8 h-8 opacity-70 shrink-0" />
         <p>
            Halaman analitik ini di-generate khusus untuk kemudahan penarikan data Skripsi Bab 4. Metrik akan terisi 
            secara otomatis ketika ada aktivitas minting (menggunakan MATIC) dan verifikasi memindai kode QR.
         </p>
      </div>
    </div>
  );
}
