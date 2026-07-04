"use client";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
type ToasterProps = React.ComponentProps<typeof Sonner>;
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      richColors
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-slate-950 group-[.toaster]:text-slate-50 group-[.toaster]:border-slate-800 group-[.toaster]:shadow-lg",
          title: "text-slate-50",
          description: "text-slate-300",
          actionButton:
            "group-[.toast]:bg-emerald-600 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-slate-800 group-[.toast]:text-slate-200",
        },
      }}
      {...props}
    />
  );
};
export { Toaster };

