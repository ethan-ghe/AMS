import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useAuth } from "@/contextproviders/AuthContext";
import { useConfig } from "@/contextproviders/ConfigContext";
import { AppSidebar } from "@/components/app-sidebar"
import { SplashScreen } from "../../components/splashscreen"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Upload, FileText, X, RotateCcw, AlertTriangle } from "lucide-react"
import { useDropzone } from 'react-dropzone'
import JSZip from 'jszip'


function ListMaker() {
  const { loading } = useAuth();
  const { configData } = useConfig();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [fileCount, setFileCount] = useState(0);

  const MAX_ROWS_PER_FILE = 499999;


  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };


  const getUniqueNumbers = useCallback((numbers, count) => {
    if (numbers.length < count) {
      toast.warning(`Only ${numbers.length} numbers available, need ${count}`);
      return numbers;
    }


    const shuffled = shuffleArray(numbers);
    return shuffled.slice(0, count);
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split('\n').map(row => {

        const cells = [];
        let cell = '';
        let inQuotes = false;

        for (let i = 0; i < row.length; i++) {
          const char = row[i];

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cells.push(cell);
            cell = '';
          } else {
            cell += char;
          }
        }
        cells.push(cell);

        return cells;
      }).filter(row => row.some(cell => cell.trim()));

      setCsvData(rows);


      const dataRowCount = rows.length - 1;
      if (dataRowCount > MAX_ROWS_PER_FILE) {
        const numFiles = Math.ceil(dataRowCount / MAX_ROWS_PER_FILE);
        setFileCount(numFiles);
        setShowSplitDialog(true);
      } else {
        toast.success(`File uploaded: ${dataRowCount.toLocaleString()} rows`);
      }
    };

    reader.onerror = () => {
      toast.error('Error reading file');
    };

    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false,
    onDropRejected: (fileRejections) => {
      if (fileRejections.length > 0) {
        toast.error('Please upload a CSV file only');
      }
    }
  });

  const removeFile = () => {
    setUploadedFile(null);
    setCsvData(null);
    setShowSplitDialog(false);
    setFileCount(0);
  };

  const resetAll = () => {
    setSelectedDomain('');
    setUploadedFile(null);
    setCsvData(null);
    setIsGenerating(false);
    setShowSplitDialog(false);
    setFileCount(0);
  };

  const handleDialogCancel = () => {
    setShowSplitDialog(false);
    removeFile();
  };

  const handleDialogProceed = () => {
    setShowSplitDialog(false);
    const dataRowCount = csvData.length - 1;
    toast.success(`File uploaded: ${dataRowCount.toLocaleString()} rows - will be split into ${fileCount} files`);
  };

  const generateCSV = useCallback(async () => {
    if (!csvData || !selectedDomain || !configData?.numberPoolData) {
      toast.error('Please select a domain and upload a file');
      return;
    }

    setIsGenerating(true);

    try {
      const [headers, ...dataRows] = csvData;


      let columnPrefix, columnCount, numbers;

      if (selectedDomain === 'inbound') {
        columnPrefix = 'Outbound_';
        columnCount = 5;
        numbers = configData.numberPoolData.inbound || [];
      } else {
        columnPrefix = 'ANI_';
        columnCount = 12;
        numbers = configData.numberPoolData.outbound || [];
      }


      if (numbers.length < columnCount) {
        toast.error(`Not enough numbers in pool. Need ${columnCount}, have ${numbers.length}`);
        setIsGenerating(false);
        return;
      }


      const newColumns = Array.from({ length: columnCount }, (_, i) => `${columnPrefix}${i + 1}`);
      const newHeaders = [...headers, ...newColumns];


      const needsSplit = dataRows.length > MAX_ROWS_PER_FILE;
      const timestamp = new Date().toISOString().split('T')[0];

      if (needsSplit) {

        const zip = new JSZip();
        const numFiles = Math.ceil(dataRows.length / MAX_ROWS_PER_FILE);

        for (let fileIndex = 0; fileIndex < numFiles; fileIndex++) {
          const startIdx = fileIndex * MAX_ROWS_PER_FILE;
          const endIdx = Math.min(startIdx + MAX_ROWS_PER_FILE, dataRows.length);
          const fileDataRows = dataRows.slice(startIdx, endIdx);


          const newRows = [newHeaders];
          fileDataRows.forEach(row => {
            const rowNumbers = getUniqueNumbers(numbers, columnCount);
            newRows.push([...row, ...rowNumbers]);
          });


          const csvContent = newRows.map(row =>
            row.map(cell => {
              const cellStr = String(cell).trim();
              if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            }).join(',')
          ).join('\n');


          const filename = `five9_list_${selectedDomain}_${timestamp}_part${fileIndex + 1}of${numFiles}.csv`;
          zip.file(filename, csvContent);
        }


        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(zipBlob);

        link.setAttribute('href', url);
        link.setAttribute('download', `five9_list_${selectedDomain}_${timestamp}.zip`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`${numFiles} files packaged into ZIP successfully`);
      } else {

        const newRows = [newHeaders];
        dataRows.forEach(row => {
          const rowNumbers = getUniqueNumbers(numbers, columnCount);
          newRows.push([...row, ...rowNumbers]);
        });


        const csvContent = newRows.map(row =>
          row.map(cell => {
            const cellStr = String(cell).trim();
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          }).join(',')
        ).join('\n');


        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `five9_list_${selectedDomain}_${timestamp}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('List generated successfully');
      }
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast.error('Error generating list');
    } finally {
      setIsGenerating(false);
    }
  }, [csvData, selectedDomain, configData, getUniqueNumbers]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {loading === true && (
          <SplashScreen />
        )}
        <header className="flex h-16 shrink-0 items-center justify-between transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  Utility
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbPage className="hidden md:block">
                  List Builder
                </BreadcrumbPage>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6">
          <div className="w-full max-w-2xl space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Five9 List Builder</h1>
              <p className="text-muted-foreground">Select a domain and upload your list</p>
            </div>

            {/* Domain Selector */}
            <div className="flex flex-col items-center gap-3">
              <Label htmlFor="domain" className="text-base font-medium">
                Domain
              </Label>
              <Select value={selectedDomain} onValueChange={(value) => setSelectedDomain(value)}>
                <SelectTrigger id="domain" className="w-full max-w-xs">
                  <SelectValue placeholder="Select target domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='inbound'>
                    Inbound
                  </SelectItem>
                  <SelectItem value='outbound'>
                    Outbound
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File Upload - Dropzone */}
            <div className="flex flex-col items-center gap-3">
              <Label className="text-base font-medium">
                Upload CSV
              </Label>
              {!uploadedFile ? (
                <div
                  {...getRootProps()}
                  className={`w-full max-w-xs border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                  {isDragActive ? (
                    <p className="text-sm text-muted-foreground">Drop the file here</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium mb-1">
                        Drag & drop your CSV here
                      </p>
                      <p className="text-xs text-muted-foreground">
                        or click to browse
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="w-full max-w-xs border rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {csvData ? (csvData.length - 1).toLocaleString() : 0} rows
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="flex flex-col items-center gap-3 pt-4">
              <Button
                size="lg"
                onClick={generateCSV}
                disabled={!uploadedFile || !selectedDomain || isGenerating}
                className="gap-2"
              >
                <FileText className="h-5 w-5" />
                {isGenerating ? 'Generating...' : 'Generate List'}
              </Button>

              {/* Reset Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAll}
                disabled={isGenerating}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Split File Warning Dialog */}
      <AlertDialog open={showSplitDialog} onOpenChange={setShowSplitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center justify-center gap-2 text-xl">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              File Split Required
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Five9 has a 499,999 row limit per file. Your file contains{' '}
                <span className="font-semibold">{csvData ? (csvData.length - 1).toLocaleString() : 0} rows</span>.
              </p>
              <p>
                This will be split into{' '}
                <span className="font-semibold">{fileCount} separate files</span>{' '}
                and packaged as a ZIP when you generate the list.
              </p>
              <p className="text-sm">Do you want to proceed?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDialogCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDialogProceed}>Proceed</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}

export default ListMaker;