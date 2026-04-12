"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ArrowLeft01Icon,
    CheckmarkCircle01Icon,
    PowerIcon,
    Settings01Icon,
    GridIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";

function ToggleClassic({
    isOn,
    onToggle,
    disabled = false,
}: {
    isOn: boolean;
    onToggle: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onToggle}
            disabled={disabled}
            className={`
        relative px-6 py-3 font-bold uppercase text-xs tracking-widest border-2 transition-all
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:scale-[1.01] active:translate-y-px active:translate-x-px"}
        ${
            isOn
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-foreground border-foreground hover:bg-foreground hover:text-background"
        }
    `}
        >
            {isOn ? "On" : "Off"}
        </button>
    );
}

function ToggleOutline({
    isOn,
    onToggle,
    disabled = false,
}: {
    isOn: boolean;
    onToggle: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onToggle}
            disabled={disabled}
            className={`
        relative px-6 py-3 font-bold uppercase text-xs tracking-widest border-2 transition-all
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:scale-[1.01] active:translate-y-px active:translate-x-px"}
        ${
            isOn
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-foreground border-border-strong hover:border-foreground hover:bg-foreground/10"
        }
    `}
        >
            {isOn ? "Active" : "Inactive"}
        </button>
    );
}

function ToggleAccent({
    isOn,
    onToggle,
    accentColor = "green",
    disabled = false,
}: {
    isOn: boolean;
    onToggle: () => void;
    accentColor?: string;
    disabled?: boolean;
}) {
    const colorClasses = {
        green: {
            on: "bg-success text-background border-success",
            off: "bg-transparent text-success border-success hover:bg-success hover:text-background",
            disabled: "bg-success/30 text-success/50 border-success/30",
        },
        blue: {
            on: "bg-info text-white border-info",
            off: "bg-transparent text-info border-info hover:bg-info hover:text-white",
            disabled: "bg-info/30 text-info/50 border-info/30",
        },
        red: {
            on: "bg-danger text-white border-danger",
            off: "bg-transparent text-danger border-danger hover:bg-danger hover:text-white",
            disabled: "bg-danger/30 text-danger/50 border-danger/30",
        },
        yellow: {
            on: "bg-warning text-black border-warning",
            off: "bg-transparent text-warning border-warning hover:bg-warning hover:text-black",
            disabled: "bg-warning/30 text-warning/50 border-warning/30",
        },
    };

    const colors = colorClasses[accentColor as keyof typeof colorClasses] || colorClasses.green;
    const finalClass = disabled ? colors.disabled : isOn ? colors.on : colors.off;

    return (
        <button
            onClick={onToggle}
            disabled={disabled}
            className={`
        relative px-6 py-3 font-bold uppercase text-xs tracking-widest border-2 transition-all
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:scale-[1.01] active:translate-y-px active:translate-x-px"}
        ${finalClass}
    `}
        >
            {isOn ? "Enabled" : "Disabled"}
        </button>
    );
}

function ToggleWithIcon({
    isOn,
    onToggle,
    disabled = false,
}: {
    isOn: boolean;
    onToggle: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onToggle}
            disabled={disabled}
            className={`
        relative inline-flex items-center gap-3 px-6 py-3 font-bold uppercase text-xs tracking-widest border-2 transition-all
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:scale-[1.01] active:translate-y-px active:translate-x-px"}
        ${
            isOn
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-foreground border-foreground hover:bg-foreground hover:text-background"
        }
    `}
        >
            <HugeiconsIcon icon={isOn ? PowerIcon : PowerIcon} size={16} />
            {isOn ? "Power On" : "Power Off"}
        </button>
    );
}

function ToggleWithLoading({
    isOn,
    onToggle,
    isLoading = false,
    disabled = false,
}: {
    isOn: boolean;
    onToggle: () => void;
    isLoading?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onToggle}
            disabled={disabled || isLoading}
            className={`
        relative inline-flex items-center gap-3 px-6 py-3 font-bold uppercase text-xs tracking-widest border-2 transition-all
        ${disabled || isLoading ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:scale-[1.01] active:translate-y-px active:translate-x-px"}
        ${
            isOn
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-foreground border-foreground hover:bg-foreground hover:text-background"
        }
    `}
        >
            {isLoading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent animate-spin" />
            ) : (
                <HugeiconsIcon icon={isOn ? CheckmarkCircle01Icon : Settings01Icon} size={16} />
            )}
            {isLoading ? "Processing" : isOn ? "Connected" : "Disconnected"}
        </button>
    );
}

function SegmentedControl({
    options,
    selected,
    onSelect,
}: {
    options: { value: string; label: string }[];
    selected: string;
    onSelect: (value: string) => void;
}) {
    return (
        <div className="inline-flex border border-border-strong">
            {options.map((option, index) => (
                <button
                    key={option.value}
                    onClick={() => onSelect(option.value)}
                    className={`
                relative px-5 py-3 font-bold uppercase text-xs tracking-widest border-2 transition-all
                ${index === 0 ? "border-r-0" : index === options.length - 1 ? "" : "border-r-0"}
                ${
                    selected === option.value
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-foreground border-border-strong hover:border-foreground hover:bg-foreground/5"
                }
            `}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

function Card({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <div className="p-6 bg-panel border border-border">
            <div className="mb-6 space-y-2">
                <h3 className="text-lg font-bold uppercase tracking-wider">{title}</h3>
                <p className="text-sm text-muted">{description}</p>
            </div>
            <div className="flex flex-wrap gap-3">{children}</div>
        </div>
    );
}

export default function ButtonsPreviewPage() {
    const [classicOn, setClassicOn] = useState(false);
    const [outlineOn, setOutlineOn] = useState(false);
    const [accentGreenOn, setAccentGreenOn] = useState(false);
    const [accentBlueOn, setAccentBlueOn] = useState(false);
    const [accentRedOn, setAccentRedOn] = useState(false);
    const [accentYellowOn, setAccentYellowOn] = useState(false);
    const [iconOn, setIconOn] = useState(false);
    const [loadingOn, setLoadingOn] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [segmentedValue, setSegmentedValue] = useState("grid");

    const handleToggleLoading = () => {
        if (!isLoading) {
            setIsLoading(true);
            setTimeout(() => {
                setLoadingOn(!loadingOn);
                setIsLoading(false);
            }, 1500);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-12 animate-in fade-in duration-700">
            <div className="max-w-4xl mx-auto space-y-12">
                {/* Header */}
                <div className="space-y-4">
                    <Link
                        href="/treasurechest"
                        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors group"
                    >
                        <HugeiconsIcon
                            icon={ArrowLeft01Icon}
                            size={16}
                            className="group-hover:-translate-x-1 transition-transform"
                        />
                        Back to Treasure Chest
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="p-3 border-2 border-foreground">
                            <HugeiconsIcon icon={GridIcon} size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter">
                                Toggle Buttons
                            </h1>
                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted">
                                Component Preview
                            </p>
                        </div>
                    </div>
                </div>

                {/* Classic Toggle */}
                <Card
                    title="Classic"
                    description="Standard hardline toggle with color inversion on hover"
                >
                    <ToggleClassic isOn={classicOn} onToggle={() => setClassicOn(!classicOn)} />
                    <ToggleClassic isOn={false} onToggle={() => {}} />
                    <ToggleClassic isOn={true} onToggle={() => {}} disabled />
                </Card>

                {/* Outline Toggle */}
                <Card title="Outline" description="Border-only style with subtle fill on hover">
                    <ToggleOutline isOn={outlineOn} onToggle={() => setOutlineOn(!outlineOn)} />
                    <ToggleOutline isOn={false} onToggle={() => {}} />
                    <ToggleOutline isOn={true} onToggle={() => {}} disabled />
                </Card>

                {/* Accent Toggles */}
                <Card
                    title="Accent Colors"
                    description="Uses accent colors for different states and tones"
                >
                    <div className="flex flex-wrap gap-3 w-full">
                        <ToggleAccent
                            isOn={accentGreenOn}
                            onToggle={() => setAccentGreenOn(!accentGreenOn)}
                            accentColor="green"
                        />
                        <ToggleAccent
                            isOn={accentBlueOn}
                            onToggle={() => setAccentBlueOn(!accentBlueOn)}
                            accentColor="blue"
                        />
                        <ToggleAccent
                            isOn={accentRedOn}
                            onToggle={() => setAccentRedOn(!accentRedOn)}
                            accentColor="red"
                        />
                        <ToggleAccent
                            isOn={accentYellowOn}
                            onToggle={() => setAccentYellowOn(!accentYellowOn)}
                            accentColor="yellow"
                        />
                    </div>
                </Card>

                {/* Icon Toggle */}
                <Card title="With Icon" description="Toggle button with integrated icon indicator">
                    <ToggleWithIcon isOn={iconOn} onToggle={() => setIconOn(!iconOn)} />
                    <ToggleWithIcon isOn={false} onToggle={() => {}} />
                </Card>

                {/* Loading State */}
                <Card
                    title="Loading State"
                    description="Button with loading spinner during state transition"
                >
                    <ToggleWithLoading
                        isOn={loadingOn}
                        onToggle={handleToggleLoading}
                        isLoading={isLoading}
                    />
                </Card>

                {/* Segmented Control */}
                <Card
                    title="Segmented Control"
                    description="Group of toggle buttons acting as radio selection"
                >
                    <SegmentedControl
                        options={[
                            { value: "grid", label: "Grid" },
                            { value: "list", label: "List" },
                        ]}
                        selected={segmentedValue}
                        onSelect={setSegmentedValue}
                    />
                    <SegmentedControl
                        options={[
                            { value: "search", label: "Search" },
                            { value: "user", label: "User" },
                            { value: "dollar", label: "Money" },
                        ]}
                        selected={segmentedValue}
                        onSelect={setSegmentedValue}
                    />
                </Card>

                {/* Divider */}
                <div className="h-px bg-border" />

                {/* Design Specs */}
                <div className="p-6 bg-panel border border-border">
                    <h3 className="text-lg font-bold uppercase tracking-wider mb-4">
                        Design Specifications
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-muted">Border Radius</span>
                                <code className="font-mono">0px</code>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Border Width</span>
                                <code className="font-mono">2px</code>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Padding</span>
                                <code className="font-mono">10px 16px</code>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-muted">Transition</span>
                                <code className="font-mono">150ms cubic-bezier(0.2, 0, 0, 1)</code>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Active Transform</span>
                                <code className="font-mono">translate(1px, 1px)</code>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Hover Scale</span>
                                <code className="font-mono">1.01</code>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-8 border-t border-border">
                    <p className="text-[10px] text-center text-muted font-bold uppercase tracking-[0.4em]">
                        Hardline Interface System · Toggle Button Components
                    </p>
                </div>
            </div>
        </div>
    );
}
