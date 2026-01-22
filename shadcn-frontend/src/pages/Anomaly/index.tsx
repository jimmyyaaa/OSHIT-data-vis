import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
    ShieldAlert,
    AlertTriangle,
    Info,
    Calendar as CalendarIcon,
    Search,
    Copy,
    ExternalLink,
    Filter,
    Check
} from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { fetchAnomalyData, formatDate } from "@/services/dataService";
import { StatisticCard } from "@/components/StatisticCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AnomalyDetail {
    date: string;
    address: string;
    type: string;
    description: string;
    severity: string;
    data: Record<string, any>;
}

interface AnomalySummary {
    totalCount: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
}

interface AnomalyResponse {
    summary: AnomalySummary;
    anomalies: AnomalyDetail[];
}

export default function AnomalyPage() {
    const { getTranslations } = useLocale();
    const t = getTranslations();

    // 默认选取昨天
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d;
    });

    const [data, setData] = useState<AnomalyResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState<string>("all");

    const fetchData = async (date: Date) => {
        try {
            setLoading(true);
            setError(null);
            const dateStr = formatDate(date);
            const result = await fetchAnomalyData(dateStr);
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(selectedDate);
    }, [selectedDate]);

    const filteredAnomalies = data?.anomalies.filter(a => {
        const matchesSearch = a.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.description.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = selectedType === "all" || a.type === selectedType;

        return matchesSearch && matchesType;
    }) ?? [];

    const getSeverityBadge = (severity: string) => {
        switch (severity.toLowerCase()) {
            case 'high':
                return <Badge variant="destructive">{t.anomaly.levels.high}</Badge>;
            case 'medium':
                return <Badge variant="warning">{t.anomaly.levels.medium}</Badge>;
            case 'low':
                return <Badge variant="secondary">{t.anomaly.levels.low}</Badge>;
            default:
                return <Badge variant="outline">{severity}</Badge>;
        }
    };

    const getAnomalyIcon = (severity: string) => {
        switch (severity.toLowerCase()) {
            case 'high': return <ShieldAlert className="size-4 text-destructive" />;
            case 'medium': return <AlertTriangle className="size-4 text-yellow-500" />;
            default: return <Info className="size-4 text-blue-500" />;
        }
    };

    const formatAnomalyDescription = (item: AnomalyDetail) => {
        const descriptions = t.anomaly.typeDescriptions as Record<string, string>;

        // 1. 优先查找本地语言包是否有该异常类型的翻译模板
        if (descriptions && descriptions[item.type]) {
            let template = descriptions[item.type];

            // 执行模板变量替换 (如 {draws} -> 4)
            if (item.data) {
                Object.entries(item.data).forEach(([key, value]) => {
                    // 兼容性处理: 后端的 luckyDraws 映射到模板中的 draws
                    const templateKey = key === 'luckyDraws' ? 'draws' : key;
                    template = template.replace(`{${templateKey}}`, String(value));
                });
            }
            return template;
        }

        // 2. 如果语言包没有定义（可能是新加的类型），则退而求其次显示后端给的可读描述
        return item.description || item.type;
    };

    return (
        <div className="w-full h-full flex flex-col p-6 overflow-auto space-y-6">
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Summary Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight">{t.anomaly.overview}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {loading ? (
                        Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
                    ) : (
                        <>
                            <StatisticCard
                                title={t.anomaly.totalAnomalies}
                                value={data?.summary.totalCount ?? 0}
                            />
                            <StatisticCard
                                title={t.anomaly.highRisk}
                                value={data?.summary.highRiskCount ?? 0}
                            />
                            <StatisticCard
                                title={t.anomaly.mediumRisk}
                                value={data?.summary.mediumRiskCount ?? 0}
                            />
                            <StatisticCard
                                title={t.anomaly.lowRisk}
                                value={data?.summary.lowRiskCount ?? 0}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Detail Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight">{t.anomaly.detailTitle}</h2>
                <Card>
                    <CardHeader className="pb-3 px-6 pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-60 justify-start text-left font-normal",
                                                !selectedDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {selectedDate ? format(selectedDate, "PPP") : <span>{t.anomaly.selectDate}</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={(date) => date && setSelectedDate(date)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-9 gap-2">
                                            <Filter className="h-4 w-4" />
                                            {selectedType === "all" ? t.common.all : (t.anomaly.types[selectedType as keyof typeof t.anomaly.types] || selectedType)}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                        <DropdownMenuLabel>{t.anomaly.type}</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => setSelectedType("all")}>
                                            <div className="flex items-center gap-2 w-full">
                                                <div className="w-4">
                                                    {selectedType === "all" && <Check className="h-4 w-4" />}
                                                </div>
                                                {t.common.all}
                                            </div>
                                        </DropdownMenuItem>
                                        {Object.keys(t.anomaly.types).map((typeKey) => (
                                            <DropdownMenuItem key={typeKey} onClick={() => setSelectedType(typeKey)}>
                                                <div className="flex items-center gap-2 w-full">
                                                    <div className="w-4">
                                                        {selectedType === typeKey && <Check className="h-4 w-4" />}
                                                    </div>
                                                    {t.anomaly.types[typeKey as keyof typeof t.anomaly.types]}
                                                </div>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Search address or type..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[120px] pl-6 text-center">{t.anomaly.severity}</TableHead>
                                    <TableHead className="w-[180px]">{t.common.address}</TableHead>
                                    <TableHead className="w-[200px]">{t.anomaly.type}</TableHead>
                                    <TableHead className="min-w-[400px]">{t.anomaly.details}</TableHead>
                                    <TableHead className="text-right pr-6">{t.common.viewDetails}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="pl-6 text-center"><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                            <TableCell className="text-right pr-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredAnomalies.length > 0 ? (
                                    filteredAnomalies.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="pl-6 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    {getSeverityBadge(item.severity)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 group">
                                                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                                                        {item.address.slice(0, 6)}...{item.address.slice(-4)}
                                                    </code>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => navigator.clipboard.writeText(item.address)}
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getAnomalyIcon(item.severity)}
                                                    <span className="text-sm font-medium">
                                                        {t.anomaly.types[item.type as keyof typeof t.anomaly.types] || item.type}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-normal">
                                                {formatAnomalyDescription(item)}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => window.open(`https://solscan.io/account/${item.address}`, '_blank')}
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-64 text-center text-muted-foreground">
                                            {t.common.noData}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
