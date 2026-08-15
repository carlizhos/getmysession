import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-slate-900 group-[.toaster]:text-white dark:group-[.toaster]:bg-white dark:group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-800 dark:group-[.toaster]:border-slate-200 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-[18px] px-5 py-3.5 font-medium border",
          description: "group-[.toast]:text-slate-300 dark:group-[.toast]:text-slate-600 text-xs mt-0.5",
          actionButton: "group-[.toast]:bg-indigo-500 group-[.toast]:text-white font-bold rounded-lg px-3 py-1.5 transition-transform active:scale-95",
          cancelButton: "group-[.toast]:bg-slate-800 dark:group-[.toast]:bg-slate-100 group-[.toast]:text-slate-300 dark:group-[.toast]:text-slate-600 rounded-lg px-3 py-1.5 transition-transform active:scale-95",
          icon: "group-data-[type=error]:text-red-400 dark:group-data-[type=error]:text-red-500 group-data-[type=success]:text-emerald-400 dark:group-data-[type=success]:text-emerald-500 group-data-[type=warning]:text-amber-400 dark:group-data-[type=warning]:text-amber-500 group-data-[type=info]:text-blue-400 dark:group-data-[type=info]:text-blue-500",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
