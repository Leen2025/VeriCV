// import { useEffect, useState } from "react";
// import { getHealth } from "@/api/endpoints";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";

// export default function ApiHealthProbe() {
//   const [status, setStatus] = useState<"idle"|"ok"|"error">("idle");
//   const [message, setMessage] = useState<string>("");

//   const ping = async () => {
//     setStatus("idle");
//     setMessage("Checking...");
//     try {
//       const data = await getHealth();
//       setStatus(data?.status === "ok" ? "ok" : "error");
//       setMessage(JSON.stringify(data));
//     } catch (e: any) {
//       setStatus("error");
//       setMessage(e?.message || "Network error");
//     }
//   };

//   useEffect(() => { ping(); }, []);

//   return (
//     <div className="flex items-center gap-2 text-sm">
//       <Badge variant={status === "ok" ? "default" : "destructive"}>
//         API {status === "ok" ? "OK" : status === "idle" ? "..." : "Error"}
//       </Badge>
//       <Button size="sm" variant="outline" onClick={ping}>
//         Retry
//       </Button>
//       <span className="text-muted-foreground">{message}</span>
//     </div>
//   );
// }
