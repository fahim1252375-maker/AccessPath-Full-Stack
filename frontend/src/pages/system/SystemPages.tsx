import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Compass, Search, ServerCrash, WifiOff } from 'lucide-react';
import { Button, Card } from '../../components/ui/Primitives.tsx';

export const NotFoundPage: React.FC = () => (
  <div className="max-w-lg mx-auto px-4 py-20">
    <Card className="text-center space-y-4">
      <p className="text-xs font-mono font-semibold text-[#18C6AD]">404</p>
      <h1 className="text-2xl font-bold text-[var(--ap-text)]">Page Not Found</h1>
      <p className="text-sm text-[var(--ap-muted)]">
        The requested campus resource or route could not be found.
      </p>
      <div className="flex justify-center gap-3">
        <Link to="/"><Button>Home</Button></Link>
        <Link to="/app/map"><Button variant="outline">Campus Map</Button></Link>
      </div>
    </Card>
  </div>
);

export const ServerErrorPage: React.FC = () => (
  <div className="max-w-lg mx-auto px-4 py-20">
    <Card className="text-center space-y-4">
      <ServerCrash className="w-10 h-10 text-[var(--ap-danger)] mx-auto" />
      <h1 className="text-2xl font-bold text-[var(--ap-text)]">Unexpected Server Error</h1>
      <p className="text-sm text-[var(--ap-muted)]">
        Something went wrong while communicating with the AccessPath API. Please try again.
      </p>
      <Button onClick={() => window.location.reload()}>Reload Application</Button>
    </Card>
  </div>
);

export const OfflineFallbackPage: React.FC = () => (
  <div className="max-w-lg mx-auto px-4 py-20">
    <Card className="text-center space-y-4">
      <WifiOff className="w-10 h-10 text-[#F59E0B] mx-auto" />
      <h1 className="text-2xl font-bold text-[var(--ap-text)]">You Are Currently Offline</h1>
      <p className="text-sm text-[var(--ap-muted)]">
        Live verification updates require an internet connection. Cached campus map nodes and saved route drafts remain accessible in your workspace.
      </p>
      <Link to="/app/map"><Button>Open Cached Map</Button></Link>
    </Card>
  </div>
);

export const NoSearchResultsState: React.FC<{ query: string; onReset: () => void }> = ({
  query,
  onReset,
}) => (
  <Card className="text-center space-y-3 py-10">
    <Search className="w-8 h-8 text-[var(--ap-muted)] mx-auto" />
    <h2 className="text-base font-bold text-[var(--ap-text)]">No locations match &ldquo;{query}&rdquo;</h2>
    <p className="text-xs text-[var(--ap-muted)]">
      Try searching for Central Library, Science Hall, Elevator Tower B, or Restroom.
    </p>
    <Button variant="outline" size="sm" onClick={onReset}>Reset Search</Button>
  </Card>
);

export const NoAccessibleRouteBanner: React.FC<{
  message: string;
  blockingFactors: string[];
  onRelaxFallback?: () => void;
}> = ({ message, blockingFactors, onRelaxFallback }) => (
  <Card className="border-[var(--ap-danger-border)] bg-[var(--ap-danger-bg)] space-y-3" role="alert">
    <div className="flex items-start gap-2.5 text-[var(--ap-danger)]">
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <h3 className="text-sm font-bold">No Verified Accessible Route Available</h3>
        <p className="text-xs mt-1 leading-relaxed">{message}</p>
      </div>
    </div>
    {blockingFactors.length > 0 && (
      <div className="text-xs text-[var(--ap-danger)] space-y-1 pl-7">
        <p className="font-semibold">Blocking factors detected:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          {blockingFactors.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
    )}
    {onRelaxFallback && (
      <div className="pl-7 pt-1">
        <Button variant="outline" size="sm" onClick={onRelaxFallback}>
          <Compass className="w-3.5 h-3.5" />
          <span>Inspect Routes Including Unverified Paths (Caution)</span>
        </Button>
      </div>
    )}
  </Card>
);
