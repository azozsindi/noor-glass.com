/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

import { useInventory } from '../useInventory';

interface BarcodeProps {
  value: string;
  format?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
}

export function Barcode({ value, format = "CODE128", width = 1.5, height = 25, displayValue }: BarcodeProps) {
  const { config } = useInventory();
  const svgRef = useRef<SVGSVGElement>(null);
  const finalDisplayValue = displayValue !== undefined ? displayValue : config.barcodeDisplayValue;

  useEffect(() => {
    if (svgRef.current && value && value !== "---") {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue: finalDisplayValue,
          margin: 0
        });
      } catch (e) {
        console.error("JsBarcode error:", e);
      }
    }
  }, [value, format, width, height, finalDisplayValue]);

  if (!value || value === "---") return null;

  return <svg ref={svgRef} className="max-w-full h-auto mx-auto" />;
}
