import React, { Suspense } from 'react';

const GlbViewerCore = React.lazy(() => import(/* webpackChunkName: "three-viewer" */ './GlbViewerCore'));

export default function GlbViewer(props) {
    return (
        <Suspense fallback={
            <div style={{ height: props.height || '400px' }} className="flex items-center justify-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
                <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4"></div>
                    Loading 3D Engine...
                </div>
            </div>
        }>
            <GlbViewerCore {...props} />
        </Suspense>
    );
}