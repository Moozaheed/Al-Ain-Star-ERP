import { Construction } from "lucide-react";

interface ComingSoonProps {
  module: string;
  description?: string;
}

export function ComingSoon({ module, description }: ComingSoonProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
        <Construction className="h-8 w-8 text-gray-400" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-gray-900">{module}</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        {description ?? `The ${module} module is under active development and will be available soon.`}
      </p>
      <span className="mt-4 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
        Coming Soon
      </span>
    </div>
  );
}
