import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Palette } from "lucide-react";
import { useState } from "react";
import { APP_COLORS, applyAppColor, type AppColorId } from "@/lib/app-color";

export function ColorPicker() {
  const [current, setCurrent] = useState<AppColorId>(() => {
    try {
      return (localStorage.getItem("school-shops:accent") as AppColorId) || "red";
    } catch {
      return "red";
    }
  });
  const [open, setOpen] = useState(false);

  const pick = (id: AppColorId) => {
    applyAppColor(id);
    setCurrent(id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Change site color"
          className="text-muted-foreground hover:text-foreground"
        >
          <Palette className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 border-2 border-foreground p-3">
        <p className="grid-label mb-2">Site color</p>
        <div className="grid grid-cols-4 gap-2">
          {APP_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.name}
              aria-label={c.name}
              onClick={() => pick(c.id)}
              className={`size-9 border-2 ${
                current === c.id
                  ? "border-foreground ring-2 ring-ring ring-offset-2 ring-offset-background"
                  : "border-transparent"
              }`}
              style={{ background: c.swatch }}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Colors the whole site — saved on this device.
        </p>
      </PopoverContent>
    </Popover>
  );
}
