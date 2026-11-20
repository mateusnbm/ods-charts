#!/usr/bin/env python3
"""
Converte arquivo GeoJSON para TopoJSON.
Uso:
    python geojson2topojson.py entrada.geojson saida.topojson
    python geojson2topojson.py entrada.geojson saida.topojson --quantization 1e5
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import topojson as tp
except ImportError:
    print("Erro: biblioteca 'topojson' não encontrada.")
    print("Instale com:  pip install topojson")
    sys.exit(1)

def main():
    parser = argparse.ArgumentParser(
        description="Converte GeoJSON para TopoJSON"
    )
    parser.add_argument("input", help="Arquivo GeoJSON de entrada")
    parser.add_argument("output", help="Arquivo TopoJSON de saída")
    parser.add_argument(
        "-q", "--quantization",
        type=float,
        default=None,
        help="Valor de quantização (ex: 1e4, 1e5, 1e6). Deixa o arquivo menor (opcional)"
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Salva o TopoJSON formatado (mais legível, mas maior)"
    )

    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"Erro: arquivo de entrada não encontrado → {input_path}")
        sys.exit(1)

    print(f"Lendo: {input_path}")

    with open(input_path, "r", encoding="utf-8") as f:
        geojson_data = json.load(f)

    # Cria a topologia
    if args.quantization:
        topo = tp.Topology(geojson_data, prequantize=args.quantization)
    else:
        topo = tp.Topology(geojson_data)

    # Salva o arquivo
    topo.to_json(
        fp=str(output_path),
        pretty=args.pretty
    )

    print(f"Arquivo TopoJSON gerado com sucesso → {output_path}")

if __name__ == "__main__":
    main()