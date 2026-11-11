/*
 *
 * ODSCharts – Gráficos a partir da API SIDRA + Apache ECharts
 *
 * ------------------------------------------------------------------
 *
 * Dependências: echarts (global), Fetch API, TopoJSON Client
 *
 * Uso:
 *
 *   ODSCharts.line(div, params)
 *   ODSCharts.bar(div, params)
 *   ODSCharts.ranked(div, params)
 *   ODSCharts.heatmap(div, params)
 *   ODSCharts.choropleth(div, params)
 *
 * Retorna a instância do ECharts (permite .resize(), .dispose() etc.)
 *
 */

(function (global) {
	
	'use strict';
	
	// ===========================================================================
	// Constantes
	// ===========================================================================
	
	const API_URL = 'https://apisidra.ibge.gov.br';
	
	const GEO_URL = {
		2: 'https://mateusnbm.github.io/ods-charts/geometrias/topojson/n2.topojson',
		3: 'https://mateusnbm.github.io/ods-charts/geometrias/topojson/n3.topojson',
	};
	
	const UNIDADES = {
		1: [
			{ Codigo: 1, Nome: 'Brasil' }
		],
		2: [
			{ Codigo: 1, Nome: 'Norte' },
			{ Codigo: 2, Nome: 'Nordeste' },
			{ Codigo: 3, Nome: 'Sudeste' },
			{ Codigo: 4, Nome: 'Sul' },
			{ Codigo: 5, Nome: 'Centro-Oeste' }
		],
		3: [
			{ Codigo: 12, UF: 'AC', Nome: 'Acre' }, 
			{ Codigo: 27, UF: 'AL', Nome: 'Alagoas' },
			{ Codigo: 16, UF: 'AP', Nome: 'Amapá' }, 
			{ Codigo: 13, UF: 'AM', Nome: 'Amazonas' },
			{ Codigo: 29, UF: 'BA', Nome: 'Bahia' }, 
			{ Codigo: 23, UF: 'CE', Nome: 'Ceará' },
			{ Codigo: 53, UF: 'DF', Nome: 'Distrito Federal' }, 
			{ Codigo: 32, UF: 'ES', Nome: 'Espírito Santo' },
			{ Codigo: 52, UF: 'GO', Nome: 'Goiás' }, 
			{ Codigo: 21, UF: 'MA', Nome: 'Maranhão' },
			{ Codigo: 51, UF: 'MT', Nome: 'Mato Grosso' }, 
			{ Codigo: 50, UF: 'MS', Nome: 'Mato Grosso do Sul' },
			{ Codigo: 31, UF: 'MG', Nome: 'Minas Gerais' }, 
			{ Codigo: 15, UF: 'PA', Nome: 'Pará' },
			{ Codigo: 25, UF: 'PB', Nome: 'Paraíba' }, 
			{ Codigo: 41, UF: 'PR', Nome: 'Paraná' },
			{ Codigo: 26, UF: 'PE', Nome: 'Pernambuco' }, 
			{ Codigo: 22, UF: 'PI', Nome: 'Piauí' },
			{ Codigo: 33, UF: 'RJ', Nome: 'Rio de Janeiro' }, 
			{ Codigo: 24, UF: 'RN', Nome: 'Rio Grande do Norte' },
			{ Codigo: 43, UF: 'RS', Nome: 'Rio Grande do Sul' }, 
			{ Codigo: 11, UF: 'RO', Nome: 'Rondônia' },
			{ Codigo: 14, UF: 'RR', Nome: 'Roraima' }, 
			{ Codigo: 42, UF: 'SC', Nome: 'Santa Catarina' },
			{ Codigo: 35, UF: 'SP', Nome: 'São Paulo' }, 
			{ Codigo: 28, UF: 'SE', Nome: 'Sergipe' },
			{ Codigo: 17, UF: 'TO', Nome: 'Tocantins' }
		]
	};
	
	const SIGLAS = Object.fromEntries(UNIDADES[3].map(x => [x.Codigo, x.UF]));
	
	const PALETAS = {
		amarelo:  ['#FFF3CD', '#FFC107'],
		azul:     ['#CFE2FF', '#0A58CA'],
		laranja:  ['#FFE5D0', '#FD7E14'],
		roxo:     ['#E2D9F3', '#6F42C1'],
		verde:    ['#D1E7DD', '#198754'],
		vermelho: ['#F8D7DA', '#DC3545']
	};
	
	// ===========================================================================
	// Utilitários internos
	// ===========================================================================
	
	function agregarUnidades(metadados) {
		
		metadados.NiveisTerritoriais.forEach(nivel => {
			
			nivel.Unidades = UNIDADES[nivel.Id] || [];
			
		});
		
	}
	
	function siglaUf(codigo) {
		
		return SIGLAS[codigo] || "n/a";
		
	}
	
	function cores(paleta) {
		
		return PALETAS[paleta] || PALETAS.azul;
		
	}
	
	function urlTopologia(params) {
		
		return GEO_URL[params.nivelTerritorial];
		
	}
	
	function urlMetadados(params) {
		
		return `${API_URL}/DescritoresTabela/t/${params.agregado}`;
		
	}
	
	function urlDados(params) {
		
		var url = `${API_URL}/values`;
		
		url += `/t/${params.agregado}`;
		url += `/p/${params.periodos.join(",")}`;
		url += `/v/${params.variavel}`;
		url += `/n${params.nivelTerritorial}/${params.unidadesTerritoriais.join(",")}`;
		
		params.classificacoes.forEach((classificacao) => {
			
			url += `/c${classificacao.id}/${classificacao.categorias.join(",")}`;
			
		});
		
		url += `?formato=json`;
		
		return url;
		
	}
	
	async function fetchAll(urls) {
		
		const results = await Promise.all(
			urls.map(async url => {
				
				const res = await fetch(url);
				
				if (!res.ok) throw new Error(`Falha ao carregar ${url} (${res.status})`);
				
				return res.json();
				
			})
		);
		
		return results;
		
	}
	
	// ===========================================================================
	// Gráficos
	// ===========================================================================
	
	async function line(div, params) {
		
		const urls = [
			urlMetadados(params),
			urlDados(params)
		];
		
		const [metadados, dados] = await fetchAll(urls);
		
		const pontosEixoX = 
			metadados
			.Periodos
			.filter(x => params.periodos.includes(x.Codigo))
			.map(x => { return {id: x.Codigo, nome: x.Nome}; });
		
		// Mapeia o datapoint (período, classificações e território) para o valor correspondente
		
		const pIndex = 1;
		const nIndex = 3;
		const cIndex = 4;
		
		const datapoints = {};
		
		dados.slice(1).forEach((datapoint) => {
			
			var classificacoes = 
				metadados
				.Classificacoes
				.map((x, i) => datapoint[`D${cIndex + i}C`]);
			
			var chave = '';
			
			chave += datapoint[`D${pIndex}C`] + '-';
			chave += classificacoes.length ? classificacoes.join("-") + '-' : '';
			chave += datapoint[`D${nIndex}C`];
			
			datapoints[chave] = parseFloat(datapoint.V);
			
		});
		
		// Constrói o dataset de cada série do gráfico
		
		const datasets = [];
		
		params.series.forEach((serie, index) => {
			
			var ids = serie.map(x => x.id).join('-');
			
			datasets.push({
				type: 'line',
				name: params.titulos[index],
				data: pontosEixoX.map(x => datapoints[x.id + '-' + ids])
			});
			
		});
		
		// Plota o gráfico de linhas
		
		const option = {
			title: {
				text: params.titulo,
				subtext: params.subtitulo,
				left: 'center',
			},
			tooltip: {
				trigger: 'axis'
			},
			legend: {
				bottom: 0,
				left: 'center',
				data: datasets.map(x => x.name)
			},
			grid: {
				top: '20%',
				left: '10%',
				right: '10%',
				containLabel: true
			},
			toolbox: {
				feature: {
					saveAsImage: {},
					dataView: { readOnly: false },
				}
			},
			xAxis: {
				type: 'category',
				name: params.tituloX,
				nameLocation: 'middle',
				nameGap: 35,
				data: pontosEixoX.map(x => x.nome)
			},
			yAxis: {
				type: 'value',
				name: params.tituloY,
				nameLocation: 'middle',
				nameGap: 35
			},
			series: datasets
		};
		
		const chart = echarts.init(document.getElementById(div));
		
		chart.setOption(option);
		
		return chart;
		
	}
	
	async function bar(div, params) {
		
		const urls = [
			urlMetadados(params),
			urlDados(params)
		];
		
		const [metadados, dados] = await fetchAll(urls);
		
		const pontosEixoX = 
			metadados
			.Periodos
			.filter(x => params.periodos.includes(x.Codigo))
			.map(x => { return {id: x.Codigo, nome: x.Nome}; });
		
		// Mapeia o datapoint (período, classificações e território) para o valor correspondente
		
		const pIndex = 1;
		const nIndex = 3;
		const cIndex = 4;
		
		const datapoints = {};
		
		dados.slice(1).forEach((datapoint) => {
			
			var classificacoes = 
				metadados
				.Classificacoes
				.map((x, i) => datapoint[`D${cIndex + i}C`]);
			
			var chave = "";
			
			chave += datapoint[`D${pIndex}C`] + "-";
			chave += classificacoes.length ? classificacoes.join("-") + "-" : "";
			chave += datapoint[`D${nIndex}C`];
			
			datapoints[chave] = parseFloat(datapoint.V);
			
		});
		
		// Constrói o dataset de cada série do gráfico
		
		const datasets = [];
		
		params.series.forEach((serie, index) => {
			
			var ids = serie.map(x => x.id).join("-");
			
			datasets.push({
				type: "bar",
				//stack: "total",
				name: params.titulos[index],
				data: pontosEixoX.map(x => datapoints[x.id + "-" + ids])
			});
			
		});
		
		// Plota o gráfico de barras
		
		const option = {
			title: {
				text: params.titulo,
				subtext: params.subtitulo,
				left: 'center',
			},
			tooltip: {
				trigger: 'axis'
			},
			legend: {
				bottom: 0,
				left: 'center',
				data: datasets.map(x => x.name)
			},
			grid: {
				top: '20%',
				left: '10%',
				right: '10%',
				containLabel: true
			},
			toolbox: {
				feature: {
					saveAsImage: {},
					dataView: { readOnly: false },
				}
			},
			xAxis: {
				type: 'category',
				name: params.tituloX,
				nameLocation: 'middle',
				nameGap: 35,
				data: pontosEixoX.map(x => x.nome)
			},
			yAxis: {
				type: 'value',
				name: params.tituloY,
				nameLocation: 'middle',
				nameGap: 35
			},
			series: datasets
		};
		
		const chart = echarts.init(document.getElementById(div));
		
		chart.setOption(option);
		
		return chart;
		
	}
	
	async function ranked(div, params) {
		
		const urls = [
			urlMetadados(params),
			urlDados(params)
		];
		
		const [metadados, dados] = await fetchAll(urls);
		
		var yIndex = 0;
		var yLabels = [];
		var yLabelsMap = {};
		
		// Gambiarra para obter as unidades do nível territorial (não achei api para isto)
		
		agregarUnidades(metadados);
		
		// ...
		
		const pIndex = 1;
		const nIndex = 3;
		const cIndex = 4;
		
		if (params.y.attr == "p") {
			
			yIndex = pIndex;
			yLabels = params.periodos.map(m => metadados.Periodos.find(n => n.Codigo == m).Nome);
			yLabelsMap = Object.fromEntries(params.periodos.map((k, i) => [k, yLabels[i]]));
			
		} else if (params.y.attr == "n") {
			
			const nivel = metadados.NiveisTerritoriais.find(x => x.Id == params.y.id);
			
			yIndex = nIndex;
			yLabels = params.y.selecionados.map(x => nivel.Unidades.find(k => k.Codigo == x).Nome);
			yLabelsMap = Object.fromEntries(params.y.selecionados.map((k, i) => [k, yLabels[i]]));
			
		} else if (params.y.attr == "c") {
		
			const classificacao = metadados.Classificacoes.find(x => x.Id == params.y.id);
			
			yIndex = cIndex + params.classificacoes.findIndex(x => x.id == params.y.id); 
			yLabels = params.y.selecionados.map(x => classificacao.Categorias.find(k => k.Id == x).Nome);
			yLabelsMap = Object.fromEntries(params.y.selecionados.map((k, i) => [k, yLabels[i]]));
			
		}
		
		// Mapeia as categorias de Y para o valor correspondente e constrói a série odernada
		
		const datapoints = [];
		
		dados.slice(1).forEach((datapoint) => {
			
			datapoints.push({
				nome: yLabelsMap[datapoint[`D${yIndex}C`]],
				valor: parseFloat(datapoint.V)
			});
			
		});
		
		datapoints.sort((a, b) => a.valor - b.valor);
		
		// Plota o gráfico de barras
		
		const option = {
			title: {
				text: params.titulo,
				subtext: params.subtitulo,
				left: 'center',
			},
			tooltip: {
				trigger: 'axis'
			},
			legend: {},
			grid: {
				top: '20%',
				left: '10%',
				right: '10%',
				containLabel: true
			},
			toolbox: {
				feature: {
					saveAsImage: {},
					dataView: { readOnly: false },
				}
			},
			xAxis: {
				type: 'value',
				name: params.tituloX,
				nameLocation: 'middle',
				nameGap: 35
			},
			yAxis: {
				type: 'category',
				name: params.tituloY,
				nameLocation: 'middle',
				nameGap: 35,
				data: datapoints.map(x => x.nome)
			},
			series: [{
				type: 'bar',
				data: datapoints.map(x => x.valor)
			}]
		};
		
		const chart = echarts.init(document.getElementById(div));
		
		chart.setOption(option);
		
		return chart;
		
	}
	
	async function heatmap(div, params) {
		
		const urls = [
			urlMetadados(params),
			urlDados(params)
		];
		
		const [metadados, dados] = await fetchAll(urls);
		
		var xIndex = 0;
		var yIndex = 0;
		
		var xLabels = [];
		var yLabels = [];
		
		var xLabelsMap = {};
		var yLabelsMap = {};
		
		var minV = Infinity;
		var maxV = -Infinity;
		
		// Gambiarra para obter as unidades do nível territorial (não achei api para isto)
		
		agregarUnidades(metadados);
		
		// Os eixos podem ser períodos, categorias ou unidades territoriais
		//
		// Com base no tipo de cada eixo, determinamos:
		//
		// - A posição (index) do id do tipo no arquivo de dados
		// - O nome de cada elemento a ser apresentado no eixo
		// - Mapeamento entre o id do elemento e o nome do elemento
		
		const pIndex = 1;
		const nIndex = 3;
		const cIndex = 4;
		
		if (params.x.attr == "p") {
			
			xIndex = pIndex;
			xLabels = params.periodos.map(m => metadados.Periodos.find(n => n.Codigo == m).Nome);
			xLabelsMap = Object.fromEntries(params.periodos.map((k, i) => [k, xLabels[i]]));
			
		} else if (params.x.attr == "n") {
			
			const nivel = metadados.NiveisTerritoriais.find(x => x.Id == params.x.id);
			
			xIndex = nIndex;
			xLabels = params.x.selecionados.map(x => nivel.Unidades.find(k => k.Codigo == x).Nome);
			xLabelsMap = Object.fromEntries(params.x.selecionados.map((k, i) => [k, xLabels[i]]));
			
		} else if (params.x.attr == "c") {
			
			const classificacao = metadados.Classificacoes.find(x => x.Id == params.x.id);
			
			xIndex = cIndex + params.classificacoes.findIndex(x => x.id == params.x.id); 
			xLabels = params.x.selecionados.map(x => classificacao.Categorias.find(k => k.Id == x).Nome);
			xLabelsMap = Object.fromEntries(params.x.selecionados.map((k, i) => [k, xLabels[i]]));
			
		}
		
		if (params.y.attr == "p") {
			
			yIndex = pIndex;
			yLabels = params.periodos.map(m => metadados.Periodos.find(n => n.Codigo == m).Nome);
			yLabelsMap = Object.fromEntries(params.periodos.map((k, i) => [k, yLabels[i]]));
			
		} else if (params.y.attr == "n") {
			
			const nivel = metadados.NiveisTerritoriais.find(x => x.Id == params.y.id);
			
			yIndex = nIndex;
			yLabels = params.y.selecionados.map(x => nivel.Unidades.find(k => k.Codigo == x).Nome);
			yLabelsMap = Object.fromEntries(params.y.selecionados.map((k, i) => [k, yLabels[i]]));
			
		} else if (params.y.attr == "c") {
		
			const classificacao = metadados.Classificacoes.find(x => x.Id == params.y.id);
			
			yIndex = cIndex + params.classificacoes.findIndex(x => x.id == params.y.id); 
			yLabels = params.y.selecionados.map(x => classificacao.Categorias.find(k => k.Id == x).Nome);
			yLabelsMap = Object.fromEntries(params.y.selecionados.map((k, i) => [k, yLabels[i]]));
			
		}
		
		// Formata os dados no padrão esperado pela biblioteca ([x, y, valor])
		
		var dataset = [];
		
		dados.slice(1).forEach((datapoint) => {
			
			dataset.push([
				xLabelsMap[datapoint[`D${xIndex}C`]],
				yLabelsMap[datapoint[`D${yIndex}C`]],
				parseFloat(datapoint.V)
			]);
			
			minV = Math.min(minV, dataset[dataset.length-1][2]);
			maxV = Math.max(maxV, dataset[dataset.length-1][2]);
			
		});
			
		// Plota o heatmap
		
		const option = {
			title: {
				text: params.titulo,
				subtext: params.subtitulo,
				left: 'center'
			},
			tooltip: {
				position: 'top',
				formatter: params => {
					const [x, y, valor] = params.data;
					return `${y} - ${x}: ${valor}`;
				}
			},
			toolbox: {
				feature: {
					saveAsImage: {},
					dataView: { readOnly: true }
				}
			},
			grid: {
				top: '20%',
				left: '10%',
				right: '10%',
				bottom: '10%',
				containLabel: true
			},
			xAxis: {
				type: 'category',
				name: params.tituloX,
				nameLocation: 'middle',
				nameGap: 35,
				data: xLabels,
			},
			yAxis: {
				type: 'category',
				name: params.tituloY,
				nameLocation: 'middle',
				nameGap: 35,
				data: yLabels,
			},
			visualMap: {
				show: false,
				min: minV,
				max: maxV,
				inRange: {
					color: cores(params.paleta)
				}
			},
			series: [{
				type: 'heatmap',
				data: dataset,
				label: {
					show: true, fontSize: 9
				},
				itemStyle: {
					borderColor: '#fff',
					borderWidth: 1
				},
				emphasis: {
					itemStyle: {
						shadowBlur: 8,
						shadowColor: 'rgba(0, 0, 0, 0.35)'
					}
				}
			}]
		};
		
		const chart = echarts.init(document.getElementById(div));
		
		chart.setOption(option);
		
		return chart;
		
	}
	
	async function choropleth(div, params) {
		
		const urls = [
			urlMetadados(params),
			urlDados(params),
			urlTopologia(params)
		];
		
		const [metadados, dados, topologia] = await fetchAll(urls);
		
		// Converte as geometrias de topojson para geojson
		
		const features = Object.entries(topologia.objects).map(([codigo, objeto]) => {
			
			return topojson.feature(topologia, objeto).features[0];
			
		});
		
		const geometrias = { type: 'FeatureCollection', features };
		
		// Mapeia o datapoint (território) para o valor correspondente
		
		var datapoints = {};
		
		dados.slice(1).forEach((datapoint) => {
			
			var codigo = datapoint["D3C"];
			var nome = datapoint["D3N"];
			
			if (params.nivelTerritorial == 3) {
				
				nome = siglaUf(codigo);
				
			}
			
			datapoints[codigo] = {
				name: nome,
				value: parseFloat(datapoint.V)
			};
			
		});
		
		// ...
		
		var minV = Infinity;
		var maxV = -Infinity;
		
		geometrias.features.forEach((feature) => {
			
			const codigo = feature.properties.codarea;//feature.properties[geo.attr];
			
			feature.properties.name = datapoints[codigo].name;
			feature.properties.value = datapoints[codigo].value;
			
			minV = Math.min(minV, feature.properties.value);
			maxV = Math.max(maxV, feature.properties.value);
			
		});
		
		// ...
		
		echarts.registerMap("geometrias", geometrias);
		
		// Plota o mapa coroplético
		
		const option = {
			title: {
				text: params.titulo,
				subtext: params.subtitulo,
				left: 'center'
			},
			tooltip: {
				trigger: 'item',
				formatter: ({ name, value }) => `${name}: ${value ?? 'sem dado'}`
			},
			toolbox: {
				feature: {
					saveAsImage: {},
					restore: {},
					dataView: { readOnly: true }
				}
			},
			visualMap: {
				min: minV,
				max: maxV,
				orient: "horizontal",
				left: "center",
				bottom: 0,
				calculable: true,
				inRange: {
					color: cores(params.paleta)
				},
				text: ["Maior", "Menor"],
			},
			series: [{
				type: "map",
				map: "geometrias",
				top: "15%",
				bottom: "15%",
				label: {
					show: true,
					formatter: (p) => {
						const estilo = p.value > ((maxV - minV) / 2) ? "claro" : "escuro";
						return `{${estilo}|${p.name}}`;
					},
					rich: {
						claro: {
							color: '#fff',
							textBorderColor: 'rgba(0, 0, 0, 0.45)',
							textBorderWidth: 2
					},
						escuro: {
							color: '#222',
							textBorderColor: 'rgba(255, 255, 255, 0.7)',
							textBorderWidth: 2
						}
					}
				},
				roam: true,
				data: Object.values(datapoints),
				itemStyle: {
					borderColor: '#fff'
				},
				emphasis: {
					label: { show: true }
				}
			}]
		};
		
		const chart = echarts.init(document.getElementById(div));
		
		chart.setOption(option); // { notMerge: true }
		
		return chart;
		
	}
	
	// ===========================================================================
	// API pública
	// ===========================================================================
	
	const ODSCharts = {
		line,
		bar,
		ranked,
		heatmap,
		choropleth,
		utils: { agregarUnidades },
		constants: { PALETAS }
	};
	
	// Exposição (UMD simples)
	if (typeof module !== 'undefined' && module.exports) {
		
		module.exports = ODSCharts;
		
	} else if (typeof define === 'function' && define.amd) {
		
		define([], () => ODSCharts);
		
	} else {
		
		global.ODSCharts = ODSCharts;
		
	}
	
})(typeof window !== 'undefined' ? window : globalThis);