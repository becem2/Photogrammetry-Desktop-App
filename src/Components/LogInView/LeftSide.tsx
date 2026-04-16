
// Branded hero panel for the login view.
function LeftSide() {
    return (
        <div className="relative h-full w-full overflow-hidden bg-linear-to-br from-lime-700 via-emerald-700 to-sky-700 p-8 text-white lg:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.2),transparent_36%),radial-gradient(circle_at_82%_74%,rgba(186,230,253,0.2),transparent_34%)]" />
            <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.35)_1px,transparent_1px)] bg-size-[48px_48px]" />
            <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-lime-100/25 blur-3xl" />
            <div className="absolute -bottom-28 -right-20 h-72 w-72 rounded-full bg-sky-200/25 blur-3xl" />
            <div className="absolute top-1/3 right-10 h-44 w-44 rounded-full border border-white/35 bg-white/10 backdrop-blur-xl" />

            <div className="relative z-10 flex h-full flex-col justify-between">
                <div>
                    <p className="inline-flex items-center rounded-full border border-white/35 bg-white/15 px-4 py-1 text-xs font-semibold tracking-[0.18em] uppercase">
                        Project X
                    </p>
                    <h1 className="mt-6 max-w-md text-4xl leading-tight font-black md:text-5xl">
                        Fly fields. Map crops. Act faster.
                    </h1>
                    <p className="mt-4 max-w-lg text-sm text-white/90 md:text-base">
                        Plan drone missions, process orthomosaics, and monitor plant health with precise
                        geospatial layers built for modern agriculture teams.
                    </p>
                </div>

                <div className="grid gap-4">
                    <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-xl transition hover:bg-white/15">
                        <p className="text-xs tracking-widest uppercase text-lime-100">Today&apos;s Flight Window</p>
                        <p className="mt-2 text-lg font-semibold">06:10 - 09:40 AM, low wind</p>
                    </div>

                    <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-xl transition hover:bg-white/15">
                        <p className="text-xs tracking-widest uppercase text-lime-100">Latest Field Map</p>
                        <p className="mt-2 text-lg font-semibold">North Orchard - NDVI updated 14m ago</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LeftSide;