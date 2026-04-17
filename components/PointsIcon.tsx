"use client";

import React from "react";

interface PointsIconProps {
    className?: string;
}

export const PointsIcon: React.FC<PointsIconProps> = ({ className }) => {
    return (
        <svg
            width="19"
            height="19"
            viewBox="0 0 19 19"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="PointsGradient1" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop stopColor="#51a8ff" stopOpacity="1" offset="0%"></stop>
                    <stop stopColor="#00468c" stopOpacity="1" offset="98.8889%"></stop>
                </linearGradient>
                <linearGradient id="PointsGradient2" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop stopColor="#00468c" stopOpacity="1" offset="0%"></stop>
                    <stop stopColor="#4fa7ff" stopOpacity="1" offset="97.7778%"></stop>
                </linearGradient>
                <filter id="PointsFilter1" x="-100%" y="-100%" width="300%" height="300%">
                    <feOffset result="out" in="SourceGraphic" dx="0" dy="1"></feOffset>
                    <feColorMatrix
                        result="out"
                        in="out"
                        type="matrix"
                        values="0 0 0 0.0118 0  0 0 0 0.2863 0  0 0 0 0.5647 0  0 0 0 0.651 0"
                    ></feColorMatrix>
                    <feGaussianBlur result="out" in="out" stdDeviation="1"></feGaussianBlur>
                    <feBlend in="SourceGraphic" in2="out" mode="normal" result="Drop_Shadow1"></feBlend>
                </filter>
                <linearGradient id="PointsGradient3" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop stopColor="#ffffff" stopOpacity="0" offset="0%"></stop>
                    <stop stopColor="#ffffff" stopOpacity="0.298" offset="100%"></stop>
                </linearGradient>
            </defs>
            <g>
                <path
                    d="M 0.189 9.5 C 0.189 4.3579 4.3577 0.189 9.5 0.189 C 14.6423 0.189 18.811 4.3579 18.811 9.5 C 18.811 14.6421 14.6423 18.811 9.5 18.811 C 4.3577 18.811 0.189 14.6421 0.189 9.5 Z"
                    fill="url(#PointsGradient1)"
                ></path>
                <path
                    d="M 2.075 9.5 C 2.075 5.3994 5.3992 2.075 9.5 2.075 C 13.6008 2.075 16.925 5.3994 16.925 9.5 C 16.925 13.6006 13.6008 16.925 9.5 16.925 C 5.3992 16.925 2.075 13.6006 2.075 9.5 Z"
                    fill="url(#PointsGradient2)"
                ></path>
                <g filter="url(#PointsFilter1)">
                    <path
                        d="M 8.9844 11 C 11.4844 11 12.75 9.75 12.75 7.25 C 12.75 5.0938 11.4063 4 8.7344 4 C 8.5313 4 7.9531 4.0313 7 4.0625 L 7 15 L 8 15 L 8 10.9375 C 8.5 10.9844 8.8281 11 8.9844 11 L 8.9844 11 ZM 8.8594 5 C 10.9531 5 12 5.7969 12 7.3906 C 12 9.1406 11.0156 10 9.0625 10 C 9.0156 10 8.6563 9.9844 8 9.9219 L 8 5.0781 C 8.3594 5.0313 8.6406 5 8.8594 5 L 8.8594 5 Z"
                        fill="#ffffff"
                    ></path>
                </g>
                <path
                    d="M 0.9451 5.5898 C 2.8486 8.2603 5.9707 10 9.5 10 C 13.0293 10 16.1514 8.2603 18.0549 5.5898 C 16.5706 2.3484 13.2986 0.095 9.5 0.095 C 5.7014 0.095 2.4294 2.3484 0.9451 5.5898 Z"
                    fill="url(#PointsGradient3)"
                ></path>
                <path
                    d="M 0.9451 5.5898 C 2.8486 8.2603 5.9707 10 9.5 10 C 13.0293 10 16.1514 8.2603 18.0549 5.5898 C 16.5706 2.3484 13.2986 0.095 9.5 0.095 C 5.7014 0.095 2.4294 2.3484 0.9451 5.5898 Z"
                    fill="url(#PointsGradient3)"
                ></path>
            </g>
        </svg>
    );
};
