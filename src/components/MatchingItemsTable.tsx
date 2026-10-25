"use client";

import React from "react";
import { MatchingItem } from "../lib/types";
import { stripMarkdownFormatting } from "../lib/markdownPaperParser";

interface MatchingItemsTableProps {
  items?: MatchingItem[];
  headers?: {
    left: string;
    right: string;
  };
}

export function MatchingItemsTable({
  items = [],
  headers,
}: MatchingItemsTableProps) {
  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[320px] border-collapse text-xs sm:text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:text-xs">
            <th className="w-1/2 border-b border-slate-200 px-3 py-2.5 sm:px-4">
              {headers?.left || "List-I"}
            </th>
            <th className="w-1/2 border-b border-l border-slate-200 px-3 py-2.5 sm:px-4">
              {headers?.right || "List-II"}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.label}-${item.rightLabel}`} className="align-top">
              <td className="border-b border-slate-100 px-3 py-2.5 text-slate-800 last:border-b-0 sm:px-4">
                <span className="mr-2 font-mono font-bold text-slate-500">
                  {item.label}.
                </span>
                {stripMarkdownFormatting(item.left)}
              </td>
              <td className="border-b border-l border-slate-100 px-3 py-2.5 text-slate-800 last:border-b-0 sm:px-4">
                <span className="mr-2 font-mono font-bold text-slate-500">
                  {item.rightLabel}.
                </span>
                {stripMarkdownFormatting(item.right)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
