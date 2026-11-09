//
// index.js
//
// ...
//

var _objetivos = null;
var _metadados = null;
var _params = null;

// Conveniências

function truncar(str, mlen) {

	return str.length > mlen ? str.slice(0, mlen) + "..." : str;

}

function combinar(conjuntos) {
	
	return conjuntos.reduce(
		(resultado, atual) =>
			resultado.flatMap(combinacao =>
				atual.map(item => [...combinacao, item])
			), [[]]
	);
	
}

function capitalizar(str) {
	
	if (!str) return str; // protege string vazia ou null/undefined
	
	return str.charAt(0).toUpperCase() + str.slice(1);
	
}

// Formulário do gráfico de linhas

function lineFormX() {
	
	var periodos = 
		_metadados
		.Periodos
		.filter(x => x.Mostrar ?? true)
		.map(x => x.Nome);
	
	var html = `
		<div class="row mb-2">
			<label for="select-eixo-x" class="col-3 col-lg-2 col-form-label">Eixo X</label>
			<div class="col">
				<div class="row mb-2">
					<div class="col">
						<select class="form-select" id="select-eixo-x">
							<option value="p" selected>${_metadados.TipoPeriodo}</option>
						</select>
					</div>
				</div>
				<div class="row">
					<div class="col fst-italic text-end" style="font-size: 0.75rem;">
						<span id="subtexto-eixo-x">
							${truncar(periodos.join(", "), 35)}
						</span>
						<button 
						type="button" 
						class="btn btn-link btn-toggles fst-italic p-0" 
						data-param="p"
						style="font-size: 0.75rem;"
						>[gerenciar]</button>
					</div>
				</div>
			</div>
		</div>`;
	
	return html;
	
}

function lineFormY() {
	
	var itens = _metadados.Variaveis.map((variavel, index) => {
		
		return `
			<option value="${variavel.Id}" ${index == 0 ? "selected" : ""}>
				${variavel.Nome}
			</option>`;
			
	});
	
	var html = `
		<div class="row mb-2">
			<label for="select-eixo-y" class="col-3 col-lg-2 col-form-label">Eixo Y</label>
			<div class="col">
				<select class="form-select" id="select-eixo-y">
					<option value="" disabled selected hidden></option>
					${itens.join("")}
				</select>
			</div>
		</div>`;
	
	return html;
	
}

function lineFormDesagregacoes() {
	
	var desagregacoes = "";
	
	_metadados.Classificacoes.forEach((classificacao) => {
		
		var categorias = 
			classificacao
			.Categorias
			.filter(x => x.Mostrar ?? true)
			.map(x => x.Nome);
		
		desagregacoes += `
			<div class="row mb-2">
				<div class="col">
					<div class="row">
						<div class="col">
							<input 
							type="text" 
							class="form-control" 
							value="Classificação - ${classificacao.Nome}" 
							disabled>
						</div>
					</div>
					<div class="row mt-2">
						<div class="col fst-italic text-end" style="font-size: 0.75rem;">
							<span id="subtexto-c-${classificacao.Id}">
								${truncar(categorias.join(", "), 35)}
							</span>
							<button 
							type="button" 
							class="btn btn-link btn-toggles fst-italic p-0" 
							data-param="c"
							data-param-id="${classificacao.Id}"
							style="font-size: 0.75rem;"
							>[gerenciar]</button>
						</div>
					</div>
				</div>
			</div>`;
			
	});
	
	var niveis = 
		_metadados
		.NiveisTerritoriais
		.map(x => `<option value="${x.Id}">Nível territorial - ${x.Nome}</option>`);
	
	var unidades = 
		_metadados
		.NiveisTerritoriais[0]
		.Unidades
		.filter(x => x.Mostrar ?? true)
		.map(x => x.Nome);
	
	desagregacoes += `
		<div class="row mb-2">
			<div class="col">
				<div class="row">
					<div class="col">
						<select class="form-select" id="select-nivel">
							${niveis}
						</select>
					</div>
				</div>
				<div class="row mt-2">
					<div class="col fst-italic text-end" style="font-size: 0.75rem;">
						<span id="subtexto-nivel-territorial">
							${truncar(unidades.join(", "), 35)}
						</span>
						<button 
						type="button" 
						class="btn btn-link btn-toggles fst-italic p-0" 
						data-param="n"
						style="font-size: 0.75rem;"
						>[gerenciar]</button>
					</div>
				</div>
			</div>
		</div>`;
	
	var html = `
		<div class="row">
			<label class="col-3 col-lg-2 col-form-label">Desagregações</label>
			<div class="col">
				${desagregacoes}
			</div>
		</div>`;
	
	return html;

}

function lineFormTitulos() {
	
	// Determina as séries
	
	var conjuntos = [];
	
	var select = $("#line-chart-form #select-nivel");
	var padrao = _metadados.NiveisTerritoriais[0].Id;
	var nivel = (select.length ? select.val() : padrao);
	
	_metadados.Classificacoes.forEach((classificacao) => {
			
		conjuntos.push(
			classificacao
			.Categorias
			.filter(x => x.Mostrar ?? true)
			.map(x => { return {Id: x.Id, Nome: x.Nome}; })
			);
	
	});
	
	conjuntos.push(
		_metadados
		.NiveisTerritoriais
		.find(x => x.Id == nivel)
		.Unidades
		.filter(x => x.Mostrar ?? true)
		.map(x => { return {Id: x.Codigo, Nome: x.Nome}; })
	);
	
	var series = combinar(conjuntos);
	
	// Gera o html com um input para cada série 
	
	var inputsHtml = "";
	
	series.forEach((serie) => {
		
		var id = serie.map(x => x.Id).join("-");
		var titulo = serie.map(x => x.Nome).join(", ");
		
		inputsHtml += `
			<div class="row mb-2">
				<div class="col">
					<div class="row">
						<div class="col">
							<input 
							type="text" 
							class="form-control" 
							value="${titulo}"
							id="input-${id}">
						</div>
					</div>
					<div class="row mt-2">
						<div class="col fst-italic text-end" style="font-size: 0.75rem;">
							<span>${titulo}</span>
						</div>
					</div>
				</div>
			</div>`;
		
	});
	
	// Constrói o html com todos os inputs
	
	var selectEixoY = $("#line-chart-form #select-eixo-y");
	var variavelSelecionada = 
		selectEixoY.length ? 
		_metadados.Variaveis.find(x => x.Id == selectEixoY.val()) : 
		_metadados.Variaveis[0];
	var tituloEixoY = `${variavelSelecionada.Nome} (${variavelSelecionada.UnidadeMedida})`;
	
	var html = `
		<!-- TÍTULO DO GRÁFICO -->
		<div class="row mb-2">
			<label for="titulo" class="col-3 col-lg-2 col-form-label">Título</label>
			<div class="col">
				<input type="text" class="form-control" id="titulo" value="${_metadados.Nome}">
			</div>
		</div>
		<!-- SUBTÍTULO -->
		<div class="row mb-2">
			<label for="subtitulo" class="col-3 col-lg-2 col-form-label">Subtítulo</label>
			<div class="col">
				<input type="text" class="form-control" id="subtitulo" value="Fonte: IBGE, ${_metadados.Pesquisa}, SIDRA, Tabela ${_metadados.Id}">
			</div>
		</div>
		<!-- TÍTULO DO EIXO X -->
		<div class="row mb-2">
			<label for="titulo-x" class="col-3 col-lg-2 col-form-label">Título X</label>
			<div class="col">
				<input type="text" class="form-control" id="titulo-x" value="${_metadados.TipoPeriodo}">
			</div>
		</div>
		<!-- TÍTULO DO EIXO Y -->
		<div class="row mb-2">
			<label for="titulo-y" class="col-3 col-lg-2 col-form-label">Título Y</label>
			<div class="col">
				<input 
				type="text" 
				class="form-control" 
				id="titulo-y" 
				value="${tituloEixoY}">
			</div>
		</div>
		<!-- TÍTULOS DAS SÉRIES -->
		<div class="row">
			<label class="col-3 col-lg-2 col-form-label">Séries</label>
			<div class="col">
				${inputsHtml}
			</div>
		</div>
	`;
	
	return html;

}

function lineFormEventSelectEixoY() {

	$(document).on("change", "#line-chart-form #select-eixo-y", function() {
		
		var variavel = 
			_metadados
			.Variaveis
			.find(x => x.Id == $(this).val());
		
		$("#line-chart-form #titulo-y").val(variavel.Nome);
		
	});

}

function lineFormEventSelectNivel() {
	
	$(document).on("change", "#line-chart-form #select-nivel", function() {
		
		var nivel = 
			_metadados
			.NiveisTerritoriais
			.find(x => x.Id == $(this).val());
		
		var unidades = 
			nivel
			.Unidades
			.filter(x => x.Mostrar ?? true)
			.map(x => x.Nome);
		
		var subtexto = truncar(unidades.join(", "), 35);
		
		$("#line-chart-form #subtexto-nivel-territorial").html(subtexto);
		
		$("#line-chart-form #titulos").html(lineFormTitulos());
		
	});
	
}

function lineFormEventBtnToggles() {
	
	$(document).on("click", "#line-chart-form .btn-toggles", function() {
		
		var param = $(this).data("param");
		var paramId = $(this).data("param-id");
		
		var titulo = "";
		var linhas = "";
		
		if (param == "p") {
			
			// Períodos 
			
			titulo = "Períodos";
			
			_metadados.Periodos.forEach((periodo) => {
				
				linhas += `
					<tr>
						<td>${periodo.Codigo}</td>
						<td>${periodo.Nome}</td>
						<td>
							<input 
							class="form-check-input" 
							type="checkbox" 
							data-id="${periodo.Codigo}"
							${periodo.Mostrar ?? true ? "checked" : ""}>
						</td>
					</tr>`;
					
				periodo.TmpMostrar = periodo.Mostrar;
				
			});
			
		} else if (param == "c") {
		
			// Categorias de uma classificação
			
			const classificacao = 
				_metadados
				.Classificacoes
				.find(x => x.Id == paramId);
			
			titulo = classificacao.Nome;
			
			classificacao.Categorias.forEach((categoria) => {
			
				linhas += `
					<tr>
						<td>${categoria.Id}</td>
						<td>${categoria.Nome}</td>
						<td>
							<input 
							class="form-check-input" 
							type="checkbox" 
							data-id="${categoria.Id}"
							${categoria.Mostrar ?? true ? "checked" : ""}>
						</td>
					</tr>`;
					
				categoria.TmpMostrar = categoria.Mostrar;
			
			});
			
		} else if (param == "n") {
			
			// Unidades de um nível territorial
			
			const nivel = 
				_metadados
				.NiveisTerritoriais
				.find(x => x.Id == $("#line-chart-form #select-nivel").val());
			
			paramId = nivel.Id;
			
			titulo = nivel.Nome;
			
			nivel.Unidades.forEach((unidade) => {
			
				linhas += `
					<tr>
						<td>${unidade.Codigo}</td>
						<td>${unidade.Nome}</td>
						<td>
							<input 
							class="form-check-input" 
							type="checkbox" 
							data-id="${unidade.Codigo}"
							${unidade.Mostrar ?? true ? "checked" : ""}>
						</td>
					</tr>`;
				
				unidade.TmpMostrar = unidade.Mostrar;
				
			});
		
		}
		
		var html = `
			<table class="table table-striped">
				<thead>
					<tr>
						<th scope="col">Código</th>
						<th scope="col">Nome</th>
						<th scope="col">
							<div class="d-flex align-items-center gap-1">
								<span>Mostrar</span>
								&nbsp;
								<button type="button" class="btn p-0 lh-1" id="btn-all">
									<i class="bi bi-check-square"></i>
								</button>
								&nbsp;
								<button type="button" class="btn p-0 lh-1" id="btn-none">
									<i class="bi bi-x-square"></i>
								</button>
							</div>
						</th>
					</tr>
				</thead>
				<tbody>
					${linhas}
				</tbody>
			</table>`;
		
		$("#modal-toggles").data("form", "line-chart-form");
		$("#modal-toggles").data("param", param);
		$("#modal-toggles").data("param-id", paramId);
		
		$("#modal-toggles .modal-title").html(titulo);
		$("#modal-toggles .modal-body").html(html);
		
		$("#modal-toggles").modal("show");
	
	});
	
}

function lineFormEventModalToggles() {
	
	$("#modal-toggles").on("hide.bs.modal", function() {
		
		$("#line-chart-form #titulos").html(lineFormTitulos());
	
	});
	
}

function lineForm() {
	
	var eixoX = lineFormX();
	var eixoY = lineFormY();
	var desagregacoes = lineFormDesagregacoes();
	var titulos = lineFormTitulos();
	
	var html = `
		<div id="line-chart-form">
			${eixoX}
			${eixoY}
			${desagregacoes}
			<div id="titulos">
				${titulos}
			</div>
		</div>
	`;
	
	$("#chart-form-wrapper").html(html);
	
	lineFormEventSelectEixoY();
	lineFormEventSelectNivel();
	lineFormEventBtnToggles();
	lineFormEventModalToggles();
	
}

function lineParams() {
	
	var titulo = $("#titulo").val();
	var subtitulo = $("#subtitulo").val();
	var tituloX = $("#titulo-x").val();
	var tituloY = $("#titulo-y").val();
	
	var variavel = parseInt($("#line-chart-form #select-eixo-y").val());
	var nivel = parseInt($("#line-chart-form #select-nivel").val());
	
	var periodos = 
		_metadados
		.Periodos
		.filter(x => x.Mostrar ?? true)
		.map(x => x.Codigo);
	
	var unidades =
		_metadados
		.NiveisTerritoriais
		.find(x => x.Id == nivel)
		.Unidades
		.filter(x => x.Mostrar ?? true)
		.map(x => x.Codigo);
	
	var conjuntos = [];
	var classificacoes = [];
	
	_metadados.Classificacoes.forEach((classificacao) => {
	
		var categorias = 
			classificacao
			.Categorias
			.filter(x => x.Mostrar ?? true)
			.map(x => { return {id: x.Id, nome: x.Nome}; });
		
		conjuntos.push(categorias);
		
		classificacoes.push({id: classificacao.Id, categorias: categorias.map(x => x.id)});
		
	});
	
	conjuntos.push(
		_metadados
		.NiveisTerritoriais
		.find(x => x.Id == nivel)
		.Unidades
		.filter(x => x.Mostrar ?? true)
		.map(x => { return {id: x.Codigo, nome: x.Nome}; })
	);
	
	var series = combinar(conjuntos);
	var titulos = series.map(x => $("#input-" + x.map(k => k.id).join("-")).val());
	
	// ...
	
	var params = {
		tipo: "line",
		agregado: _metadados.Id,
		periodos,
		variavel,
		nivelTerritorial: nivel,
		unidadesTerritoriais: unidades,
		classificacoes,
		series,
		titulos,
		titulo,
		subtitulo,
		tituloX,
		tituloY
	};
	
	return params;
	
}

// Formulário do gráfico de barras

function barEstilo() {
	
	var html = `
		<div class="row mb-2">
			<label for="select-estilo" class="col-3 col-lg-2 col-form-label">Estilo</label>
			<div class="col">
				<select class="form-select" id="select-estilo">
					<option value="simples" selected}>Barras simples</option>
					<option value="empilhadas" selected}>Barras empilhadas</option>
				</select>
			</div>
		</div>`;
	
	return html;

}

function barFormX() {
	
	var periodos = 
		_metadados
		.Periodos
		.filter(x => x.Mostrar ?? true)
		.map(x => x.Nome);
	
	var html = `
		<div class="row mb-2">
			<label for="select-eixo-x" class="col-3 col-lg-2 col-form-label">Eixo X</label>
			<div class="col">
				<div class="row mb-2">
					<div class="col">
						<select class="form-select" id="select-eixo-x">
							<option value="p" selected>${_metadados.TipoPeriodo}</option>
						</select>
					</div>
				</div>
				<div class="row">
					<div class="col fst-italic text-end" style="font-size: 0.75rem;">
						<span id="subtexto-eixo-x">
							${truncar(periodos.join(", "), 35)}
						</span>
						<button 
						type="button" 
						class="btn btn-link btn-toggles fst-italic p-0" 
						data-param="p"
						style="font-size: 0.75rem;"
						>[gerenciar]</button>
					</div>
				</div>
			</div>
		</div>`;
	
	return html;
	
}

function barFormY() {
	
	var itens = _metadados.Variaveis.map((variavel, index) => {
		
		return `
			<option value="${variavel.Id}" ${index == 0 ? "selected" : ""}>
				${variavel.Nome}
			</option>`;
			
	});
	
	var html = `
		<div class="row mb-2">
			<label for="select-eixo-y" class="col-3 col-lg-2 col-form-label">Eixo Y</label>
			<div class="col">
				<select class="form-select" id="select-eixo-y">
					<option value="" disabled selected hidden></option>
					${itens.join("")}
				</select>
			</div>
		</div>`;
	
	return html;
	
}

function barFormDesagregacoes() {
	
	var desagregacoes = "";
	
	_metadados.Classificacoes.forEach((classificacao) => {
		
		var categorias = 
			classificacao
			.Categorias
			.filter(x => x.Mostrar ?? true)
			.map(x => x.Nome);
		
		desagregacoes += `
			<div class="row mb-2">
				<div class="col">
					<div class="row">
						<div class="col">
							<input 
							type="text" 
							class="form-control" 
							value="Classificação - ${classificacao.Nome}" 
							disabled>
						</div>
					</div>
					<div class="row mt-2">
						<div class="col fst-italic text-end" style="font-size: 0.75rem;">
							<span id="subtexto-c-${classificacao.Id}">
								${truncar(categorias.join(", "), 35)}
							</span>
							<button 
							type="button" 
							class="btn btn-link btn-toggles fst-italic p-0" 
							data-param="c"
							data-param-id="${classificacao.Id}"
							style="font-size: 0.75rem;"
							>[gerenciar]</button>
						</div>
					</div>
				</div>
			</div>`;
			
	});
	
	var niveis = 
		_metadados
		.NiveisTerritoriais
		.map(x => `<option value="${x.Id}">Nível territorial - ${x.Nome}</option>`);
	
	var unidades = 
		_metadados
		.NiveisTerritoriais[0]
		.Unidades
		.filter(x => x.Mostrar ?? true)
		.map(x => x.Nome);
	
	desagregacoes += `
		<div class="row mb-2">
			<div class="col">
				<div class="row">
					<div class="col">
						<select class="form-select" id="select-nivel">
							${niveis}
						</select>
					</div>
				</div>
				<div class="row mt-2">
					<div class="col fst-italic text-end" style="font-size: 0.75rem;">
						<span id="subtexto-nivel-territorial">
							${truncar(unidades.join(", "), 35)}
						</span>
						<button 
						type="button" 
						class="btn btn-link btn-toggles fst-italic p-0" 
						data-param="n"
						style="font-size: 0.75rem;"
						>[gerenciar]</button>
					</div>
				</div>
			</div>
		</div>`;
	
	var html = `
		<div class="row">
			<label class="col-3 col-lg-2 col-form-label">Desagregações</label>
			<div class="col">
				${desagregacoes}
			</div>
		</div>`;
	
	return html;

}

function barFormTitulos() {
	
	// Determina as séries
	
	var conjuntos = [];
	
	var select = $("#bar-form #select-nivel");
	var padrao = _metadados.NiveisTerritoriais[0].Id;
	var nivel = (select.length ? select.val() : padrao);
	
	_metadados.Classificacoes.forEach((classificacao) => {
			
		conjuntos.push(
			classificacao
			.Categorias
			.filter(x => x.Mostrar ?? true)
			.map(x => { return {Id: x.Id, Nome: x.Nome}; })
			);
	
	});
	
	conjuntos.push(
		_metadados
		.NiveisTerritoriais
		.find(x => x.Id == nivel)
		.Unidades
		.filter(x => x.Mostrar ?? true)
		.map(x => { return {Id: x.Codigo, Nome: x.Nome}; })
	);
	
	var series = combinar(conjuntos);
	
	// Gera o html com um input para cada série 
	
	var inputsHtml = "";
	
	series.forEach((serie) => {
		
		var id = serie.map(x => x.Id).join("-");
		var titulo = serie.map(x => x.Nome).join(", ");
		
		inputsHtml += `
			<div class="row mb-2">
				<div class="col">
					<div class="row">
						<div class="col">
							<input 
							type="text" 
							class="form-control" 
							value="${titulo}"
							id="input-${id}">
						</div>
					</div>
					<div class="row mt-2">
						<div class="col fst-italic text-end" style="font-size: 0.75rem;">
							<span>${titulo}</span>
						</div>
					</div>
				</div>
			</div>`;
		
	});
	
	// Constrói o html com todos os inputs
	
	var selectEixoY = $("#bar-form #select-eixo-y");
	var variavelSelecionada = 
		selectEixoY.length ? 
		_metadados.Variaveis.find(x => x.Id == selectEixoY.val()) : 
		_metadados.Variaveis[0];
	var tituloEixoY = `${variavelSelecionada.Nome} (${variavelSelecionada.UnidadeMedida})`;
	
	var html = `
		<!-- TÍTULO DO GRÁFICO -->
		<div class="row mb-2">
			<label for="titulo" class="col-3 col-lg-2 col-form-label">Título</label>
			<div class="col">
				<input type="text" class="form-control" id="titulo" value="${_metadados.Nome}">
			</div>
		</div>
		<!-- SUBTÍTULO -->
		<div class="row mb-2">
			<label for="subtitulo" class="col-3 col-lg-2 col-form-label">Subtítulo</label>
			<div class="col">
				<input type="text" class="form-control" id="subtitulo" value="Fonte: IBGE, ${_metadados.Pesquisa}, SIDRA, Tabela ${_metadados.Id}">
			</div>
		</div>
		<!-- TÍTULO DO EIXO X -->
		<div class="row mb-2">
			<label for="titulo-x" class="col-3 col-lg-2 col-form-label">Título X</label>
			<div class="col">
				<input type="text" class="form-control" id="titulo-x" value="${_metadados.TipoPeriodo}">
			</div>
		</div>
		<!-- TÍTULO DO EIXO Y -->
		<div class="row mb-2">
			<label for="titulo-y" class="col-3 col-lg-2 col-form-label">Título Y</label>
			<div class="col">
				<input 
				type="text" 
				class="form-control" 
				id="titulo-y" 
				value="${tituloEixoY}">
			</div>
		</div>
		<!-- TÍTULOS DAS SÉRIES -->
		<div class="row">
			<label class="col-3 col-lg-2 col-form-label">Séries</label>
			<div class="col">
				${inputsHtml}
			</div>
		</div>
	`;
	
	return html;

}

function barFormEventSelectEixoY() {
	
	$(document).on("change", "#bar-form #select-eixo-y", function() {
		
		var variavel = 
			_metadados
			.Variaveis
			.find(x => x.Id == $(this).val());
		
		$("#bar-form #titulo-y").val(variavel.Nome);
		
	});

}

function barFormEventSelectNivel() {
	
	$(document).on("change", "#bar-form #select-nivel", function() {
		
		var nivel = 
			_metadados
			.NiveisTerritoriais
			.find(x => x.Id == $(this).val());
		
		var unidades = 
			nivel
			.Unidades
			.filter(x => x.Mostrar ?? true)
			.map(x => x.Nome);
		
		var subtexto = truncar(unidades.join(", "), 35);
		
		$("#bar-form #subtexto-nivel-territorial").html(subtexto);
		
		$("#bar-form #titulos").html(barFormTitulos());
		
	});
	
}

function barFormEventBtnToggles() {
	
	$(document).on("click", "#bar-form .btn-toggles", function() {
		
		var param = $(this).data("param");
		var paramId = $(this).data("param-id");
		
		var titulo = "";
		var linhas = "";
		
		if (param == "p") {
			
			// Períodos 
			
			titulo = "Períodos";
			
			_metadados.Periodos.forEach((periodo) => {
				
				linhas += `
					<tr>
						<td>${periodo.Codigo}</td>
						<td>${periodo.Nome}</td>
						<td>
							<input 
							class="form-check-input" 
							type="checkbox" 
							data-id="${periodo.Codigo}"
							${periodo.Mostrar ?? true ? "checked" : ""}>
						</td>
					</tr>`;
					
				periodo.TmpMostrar = periodo.Mostrar;
				
			});
			
		} else if (param == "c") {
		
			// Categorias de uma classificação
			
			const classificacao = 
				_metadados
				.Classificacoes
				.find(x => x.Id == paramId);
			
			titulo = classificacao.Nome;
			
			classificacao.Categorias.forEach((categoria) => {
			
				linhas += `
					<tr>
						<td>${categoria.Id}</td>
						<td>${categoria.Nome}</td>
						<td>
							<input 
							class="form-check-input" 
							type="checkbox" 
							data-id="${categoria.Id}"
							${categoria.Mostrar ?? true ? "checked" : ""}>
						</td>
					</tr>`;
					
				categoria.TmpMostrar = categoria.Mostrar;
			
			});
			
		} else if (param == "n") {
			
			// Unidades de um nível territorial
			
			const nivel = 
				_metadados
				.NiveisTerritoriais
				.find(x => x.Id == $("#bar-form #select-nivel").val());
			
			paramId = nivel.Id;
			
			titulo = nivel.Nome;
			
			nivel.Unidades.forEach((unidade) => {
			
				linhas += `
					<tr>
						<td>${unidade.Codigo}</td>
						<td>${unidade.Nome}</td>
						<td>
							<input 
							class="form-check-input" 
							type="checkbox" 
							data-id="${unidade.Codigo}"
							${unidade.Mostrar ?? true ? "checked" : ""}>
						</td>
					</tr>`;
				
				unidade.TmpMostrar = unidade.Mostrar;
				
			});
		
		}
		
		var html = `
			<table class="table table-striped">
				<thead>
					<tr>
						<th scope="col">Código</th>
						<th scope="col">Nome</th>
						<th scope="col">
							<div class="d-flex align-items-center gap-1">
								<span>Mostrar</span>
								&nbsp;
								<button type="button" class="btn p-0 lh-1" id="btn-all">
									<i class="bi bi-check-square"></i>
								</button>
								&nbsp;
								<button type="button" class="btn p-0 lh-1" id="btn-none">
									<i class="bi bi-x-square"></i>
								</button>
							</div>
						</th>
					</tr>
				</thead>
				<tbody>
					${linhas}
				</tbody>
			</table>`;
		
		$("#modal-toggles").data("form", "bar-form");
		$("#modal-toggles").data("param", param);
		$("#modal-toggles").data("param-id", paramId);
		
		$("#modal-toggles .modal-title").html(titulo);
		$("#modal-toggles .modal-body").html(html);
		
		$("#modal-toggles").modal("show");
	
	});
	
}

function barFormEventModalToggles() {
	
	$("#modal-toggles").on("hide.bs.modal", function() {
		
		$("#bar-form #titulos").html(barFormTitulos());
		
	});
	
}

function barForm() {
	
	var estilo = barEstilo();
	var eixoX = barFormX();
	var eixoY = barFormY();
	var desagregacoes = barFormDesagregacoes();
	var titulos = barFormTitulos();
	
	var html = `
		<div id="bar-form">
			${estilo}
			${eixoX}
			${eixoY}
			${desagregacoes}
			<div id="titulos">
				${titulos}
			</div>
		</div>
	`;
	
	$("#chart-form-wrapper").html(html);
	
	barFormEventSelectEixoY();
	barFormEventSelectNivel();
	barFormEventBtnToggles();
	barFormEventModalToggles();
	
}

function barParams() {
	
	var form = "#bar-form";
	
	var titulo 		= $(`${form} #titulo`).val();
	var subtitulo 	= $(`${form} #subtitulo`).val();
	var tituloX 	= $(`${form} #titulo-x`).val();
	var tituloY 	= $(`${form} #titulo-y`).val();
	
	var estilo 		= $(`${form} #select-estilo`).val();
	var empilhar 	= (estilo == "empilhadas");
	
	var variavel 	= parseInt($(`${form} #select-eixo-y`).val());
	var nivel 		= parseInt($(`${form} #select-nivel`).val());
	
	var periodos = 
		_metadados
		.Periodos
		.filter(x => x.Mostrar ?? true)
		.map(x => x.Codigo);
	
	var unidades =
		_metadados
		.NiveisTerritoriais
		.find(x => x.Id == nivel)
		.Unidades
		.filter(x => x.Mostrar ?? true)
		.map(x => x.Codigo);
	
	var conjuntos = [];
	var classificacoes = [];
	
	_metadados.Classificacoes.forEach((classificacao) => {
	
		var categorias = 
			classificacao
			.Categorias
			.filter(x => x.Mostrar ?? true)
			.map(x => { return {id: x.Id, nome: x.Nome}; });
		
		conjuntos.push(categorias);
		
		classificacoes.push({id: classificacao.Id, categorias: categorias.map(x => x.id)});
		
	});
	
	conjuntos.push(
		_metadados
		.NiveisTerritoriais
		.find(x => x.Id == nivel)
		.Unidades
		.filter(x => x.Mostrar ?? true)
		.map(x => { return {id: x.Codigo, nome: x.Nome}; })
	);
	
	var series = combinar(conjuntos);
	var titulos = series.map(x => $("#input-" + x.map(k => k.id).join("-")).val());
	
	// ...
	
	var params = {
		tipo: "bar",
		agregado: _metadados.Id,
		periodos,
		variavel,
		nivelTerritorial: nivel,
		unidadesTerritoriais: unidades,
		classificacoes,
		series,
		titulos,
		titulo,
		subtitulo,
		tituloX,
		tituloY
	};
	
	return params;
	
}

// Formulário do heatmap

function heatmapFormX() {
	
	var periodos = 
		_metadados
		.Periodos
		.filter(x => x.Mostrar ?? true)
		.map(x => x.Nome);
	
	var classificacoes = _metadados.Classificacoes.map((cla) => {
		
		return `
			<option value="c" data-id="${cla.Id}">
				Classificação - ${cla.Nome}
			</option>`;
		
	});
	
	var niveis = _metadados.NiveisTerritoriais.map((nivel) => {
		
		if (nivel.Id == 1 || nivel.Id == 2 || nivel.Id == 3) {
			
			return `
				<option value="n" data-id="${nivel.Id}">
					Nível Territorial - ${nivel.Nome}
				</option>`;
			
		}
		
	});
	
	var html = `
		<div class="row mb-2">
			<label for="select-eixo-x" class="col-3 col-lg-2 col-form-label">Eixo X</label>
			<div class="col">
				<div class="row mb-2">
					<div class="col">
						<select class="form-select" id="select-eixo-x">
							<option value="p" selected>
								Período - ${_metadados.TipoPeriodo}
							</option>
							${classificacoes}
							${niveis}
						</select>
					</div>
				</div>
				<div class="row">
					<div class="col fst-italic text-end" style="font-size: 0.75rem;">
						<span id="subtexto-eixo-x">
							${truncar(periodos.join(", "), 35)}
						</span>
						<button 
						type="button" 
						id="btn-eixo-x"
						class="btn btn-link btn-toggles fst-italic p-0" 
						data-param="p"
						style="font-size: 0.75rem;"
						>[gerenciar]</button>
					</div>
				</div>
			</div>
		</div>`;
	
	return html;
	
}

function heatmapFormY() {
	
	var periodos = 
		_metadados
		.Periodos
		.filter(x => x.Mostrar ?? true)
		.map(x => x.Nome);
	
	var classificacoes = _metadados.Classificacoes.map((cla) => {
		
		return `
			<option value="c" data-id="${cla.Id}">
				Classificação - ${cla.Nome}
			</option>`;
		
	});
	
	var niveis = _metadados.NiveisTerritoriais.map((nivel) => {
		
		if (nivel.Id == 1 || nivel.Id == 2 || nivel.Id == 3) {
			
			return `
				<option value="n" data-id="${nivel.Id}">
					Nível Territorial - ${nivel.Nome}
				</option>`;
			
		}
		
	});
	
	var html = `
		<div class="row mb-2">
			<label for="select-eixo-y" class="col-3 col-lg-2 col-form-label">Eixo Y</label>
			<div class="col">
				<div class="row mb-2">
					<div class="col">
						<select class="form-select" id="select-eixo-y">
							<option value="p" selected>
								Período - ${_metadados.TipoPeriodo}
							</option>
							${classificacoes}
							${niveis}
						</select>
					</div>
				</div>
				<div class="row">
					<div class="col fst-italic text-end" style="font-size: 0.75rem;">
						<span id="subtexto-eixo-y">
							${truncar(periodos.join(", "), 35)}
						</span>
						<button 
						type="button" 
						id="btn-eixo-y"
						class="btn btn-link btn-toggles fst-italic p-0" 
						data-param="p"
						style="font-size: 0.75rem;"
						>[gerenciar]</button>
					</div>
				</div>
			</div>
		</div>`;
	
	return html;
	
}

function heatmapFormVariável() {
	
	var variaveis = _metadados.Variaveis.map((variavel, index) => {
		
		return `
			<option value="${variavel.Id}" ${index == 0 ? "selected" : ""}>
				${variavel.Nome}
			</option>`;
			
	});
	
	var html = `
		<div class="row mb-2">
			<label for="select-variavel" class="col-3 col-lg-2 col-form-label">Variável</label>
			<div class="col">
				<select class="form-select" id="select-variavel">
					${variaveis.join("")}
				</select>
			</div>
		</div>`;
	
	return html;
	
}

function heatmapFormDesagregacoes() {
	
	var desagregacoes = "";
	
	var selectX = $("#heatmap-form #select-eixo-x");
	var valorX = selectX.length ? selectX.val() : null;
	var idX = selectX.length ? selectX.find("option:selected").data("id") : null;
	
	var selectY = $("#heatmap-form #select-eixo-y");
	var valorY = selectY.length ? selectY.val() : null;
	var idY = selectY.length ? selectY.find("option:selected").data("id") : null;
	
	// Adiciona um select para o período caso ele não apareça em um dos eixos
	
	if (selectX.length != 0 && valorX != "p" && selectY.length != 0 && valorY != "p") {
		
		var periodos = _metadados.Periodos.map((periodo, index) => {
			
			return `
				<option value="${periodo.Codigo}" ${index == 0 ? "selected" : ""}>
					${periodo.Nome}
				</option>`;
				
		});
		
		var desagregacoes = `
			<div class="row mb-2">
				<label for="select-periodo" class="col-3 col-lg-2 col-form-label">Período</label>
				<div class="col">
					<select class="form-select" id="select-periodo">
						${periodos.join("")}
					</select>
				</div>
			</div>`;
		
	}
	
	// Adiciona um select para as classificações que não aparecem nos eixos
	
	_metadados.Classificacoes.forEach((classificacao) => {
		
		if (selectX.length && valorX == "c" && idX == classificacao.Id) return;
		if (selectY.length && valorY == "c" && idY == classificacao.Id) return;
		
		var categorias = classificacao.Categorias.map((categoria, index) => {
			
			return `
				<option value="${categoria.Id}" ${index == 0 ? "selected" : ""}>
					${categoria.Nome}
				</option>`;
			
		});
		
		desagregacoes += `
			<div class="row mb-2">
				<label 
				for="select-cla-${classificacao.Id}" 
				class="col-3 col-lg-2 col-form-label">
					${classificacao.Nome}
				</label>
				<div class="col">
					<select class="form-select" id="select-cla-${classificacao.Id}">
						${categorias.join("")}
					</select>
				</div>
			</div>
			`;
		
	});
	
	// Adiciona um select para o território caso ele não apareça em um dos eixos
	
	if ((selectX.length == 0 || valorX != "n") && (selectY.length == 0 || valorY != "n")) {
		
		var niveis = 
			_metadados
			.NiveisTerritoriais
			.filter(x => x.Id >= 1 && x.Id <= 3)
			.map(x => `<option value="${x.Id}">${x.Nome}</option>`);
		
		var unidades = 
			_metadados
			.NiveisTerritoriais[0]
			.Unidades
			.map(x => `<option value="${x.Codigo}">${x.Nome}</option>`);
		
		desagregacoes += `
			<div class="row mb-2">
				<label 
				for="select-nivel-territorial" 
				class="col-3 col-lg-2 col-form-label">
					Nível territorial
				</label>
				<div class="col">
					<select class="form-select" id="select-nivel-territorial">
						${niveis.join("")}
					</select>
				</div>
			</div>
			<div class="row mb-2">
				<label 
				for="select-unidade-territorial" 
				class="col-3 col-lg-2 col-form-label">
					Unidade territorial
				</label>
				<div class="col">
					<select class="form-select" id="select-unidade-territorial">
						${unidades.join("")}
					</select>
				</div>
			</div>
			`;
		
	}
	
	return desagregacoes;
	
}

function heatmapFormTitulos() {
	
	var paletas = Object.entries(ODSCharts.constants.PALETAS).map(([nome, _]) => {
		
		return `<option value="${nome}">${capitalizar(nome)}</option>`;
		
	});
	
	var selectX = $("#heatmap-form #select-eixo-x");
	var valorX = selectX.length ? selectX.val() : null;
	var idX = selectX.length ? selectX.find("option:selected").data("id") : null;
	var tituloX = `${_metadados.TipoPeriodo}`;
	
	var selectY = $("#heatmap-form #select-eixo-y");
	var valorY = selectY.length ? selectY.val() : null;
	var idY = selectY.length ? selectY.find("option:selected").data("id") : null;
	var tituloY = `${_metadados.TipoPeriodo}`;
	
	if (valorX == "c") {
		
		tituloX = _metadados.Classificacoes.find(x => x.Id == idX).Nome;
		
	} else if (valorX == "n") {
		
		tituloX = _metadados.NiveisTerritoriais.find(x => x.Id == idX).Nome;
		
	}
	
	if (valorY == "c") {
		
		tituloY = _metadados.Classificacoes.find(x => x.Id == idY).Nome;
		
	} else if (valorY == "n") {
		
		tituloY = _metadados.NiveisTerritoriais.find(x => x.Id == idY).Nome;
		
	}
	
	var html = `
		<!-- TÍTULO DO GRÁFICO -->
		<div class="row mb-2">
			<label for="titulo" class="col-3 col-lg-2 col-form-label">Título</label>
			<div class="col">
				<input 
				type="text" 
				class="form-control" 
				id="titulo" 
				value="${_metadados.Nome}">
			</div>
		</div>
		<!-- SUBTÍTULO -->
		<div class="row mb-2">
			<label for="subtitulo" class="col-3 col-lg-2 col-form-label">Subtítulo</label>
			<div class="col">
				<input 
				type="text" 
				class="form-control" 
				id="subtitulo" 
				value="Fonte: IBGE, ${_metadados.Pesquisa}, SIDRA, Tabela ${_metadados.Id}">
			</div>
		</div>
		<!-- TÍTULO DO EIXO X -->
		<div class="row mb-2">
			<label for="titulo-x" class="col-3 col-lg-2 col-form-label">Título X</label>
			<div class="col">
				<input 
				type="text" 
				class="form-control" 
				id="titulo-x" 
				value="${tituloX}">
			</div>
		</div>
		<!-- TÍTULO DO EIXO Y -->
		<div class="row mb-2">
			<label for="titulo-y" class="col-3 col-lg-2 col-form-label">Título Y</label>
			<div class="col">
				<input 
				type="text" 
				class="form-control" 
				id="titulo-y" 
				value="${tituloY}">
			</div>
		</div>
		<!-- PALETA DE CORES -->
		<div class="row mb-2">
			<label for="paleta" class="col-3 col-lg-2 col-form-label">Paleta de cores</label>
			<div class="col">
				<select class="form-select" id="paleta">
					${paletas}
				</select>
			</div>
		</div>
	`;
	
	return html;
	
}

function heatmapFormEventSelectEixoX() {
	
	$(document).on("change", "#heatmap-form #select-eixo-x", function() {
		
		var tp = $(this).val();
		var id = $(this).find("option:selected").data("id");
		
		if (tp == "p") {
			
			var periodos = 
				_metadados
				.Periodos
				.filter(x => x.Mostrar ?? true)
				.map(x => x.Nome);
				
			$("#heatmap-form #subtexto-eixo-x").html(truncar(periodos.join(", "), 35));
			$("#heatmap-form #btn-eixo-x").data("param", "p");
			
		} else if (tp == "c") {
			
			var classificacao = 
				_metadados
				.Classificacoes
				.find(x => x.Id == id);
			
			var categorias = 
				classificacao
				.Categorias
				.filter(x => x.Mostrar ?? true)
				.map(x => x.Nome);
			
			$("#heatmap-form #subtexto-eixo-x").html(truncar(categorias.join(", "), 35));
			$("#heatmap-form #btn-eixo-x").data("param", "c");
			$("#heatmap-form #btn-eixo-x").data("param-id", classificacao.Id);
			
		} else if (tp == "n") {
			
			var nivel = 
				_metadados
				.NiveisTerritoriais
				.find(x => x.Id == id);
			
			var unidades = 
				nivel
				.Unidades
				.filter(x => x.Mostrar ?? true)
				.map(x => x.Nome);
			
			$("#heatmap-form #subtexto-eixo-x").html(truncar(unidades.join(", "), 35));
			$("#heatmap-form #btn-eixo-x").data("param", "n");
			$("#heatmap-form #btn-eixo-x").data("param-id", nivel.Id);
		
		}
		
		$("#heatmap-form #desagregacoes").html(heatmapFormDesagregacoes());
		$("#heatmap-form #titulos").html(heatmapFormTitulos());
		
	});

}

function heatmapFormEventSelectEixoY() {
	
	$(document).on("change", "#heatmap-form #select-eixo-y", function() {
		
		var tp = $(this).val();
		var id = $(this).find("option:selected").data("id");
		
		if (tp == "p") {
			
			var periodos = 
				_metadados
				.Periodos
				.filter(x => x.Mostrar ?? true)
				.map(x => x.Nome);
				
			$("#heatmap-form #subtexto-eixo-y").html(truncar(periodos.join(", "), 35));
			$("#heatmap-form #btn-eixo-y").data("param", "p");
			
		} else if (tp == "c") {
			
			var classificacao = 
				_metadados
				.Classificacoes
				.find(x => x.Id == id);
			
			var categorias = 
				classificacao
				.Categorias
				.filter(x => x.Mostrar ?? true)
				.map(x => x.Nome);
			
			$("#heatmap-form #subtexto-eixo-y").html(truncar(categorias.join(", "), 35));
			$("#heatmap-form #btn-eixo-y").data("param", "c");
			$("#heatmap-form #btn-eixo-y").data("param-id", classificacao.Id);
			
		} else if (tp == "n") {
			
			var nivel = 
				_metadados
				.NiveisTerritoriais
				.find(x => x.Id == id);
			
			var unidades = 
				nivel
				.Unidades
				.filter(x => x.Mostrar ?? true)
				.map(x => x.Nome);
			
			$("#heatmap-form #subtexto-eixo-y").html(truncar(unidades.join(", "), 35));
			$("#heatmap-form #btn-eixo-y").data("param", "n");
			$("#heatmap-form #btn-eixo-y").data("param-id", nivel.Id);
			
		}
		
		$("#heatmap-form #desagregacoes").html(heatmapFormDesagregacoes());
		$("#heatmap-form #titulos").html(heatmapFormTitulos());
		
	});

}

function heatmapFormEventSelectNivel() {
	
	$(document).on("change", "#heatmap-form #select-nivel-territorial", function() {
		
		var nivel = 
			_metadados
			.NiveisTerritoriais
			.find(x => x.Id == $(this).val());
		
		var unidades = 
			nivel
			.Unidades
			.map(x => `<option value="${x.Codigo}">${x.Nome}</option>`);
		
		$("#heatmap-form #select-unidade-territorial").html(unidades);
		
	});
	
}

function heatmapFormEventBtnToggles() {
	
	$(document).on("click", "#heatmap-form .btn-toggles", function() {
		
		var param = $(this).data("param");
		var paramId = $(this).data("param-id");
		
		var titulo = "";
		var linhas = "";
		
		if (param == "p") {
			
			// Períodos 
			
			titulo = "Períodos";
			
			_metadados.Periodos.forEach((periodo) => {
				
				linhas += `
					<tr>
						<td>${periodo.Codigo}</td>
						<td>${periodo.Nome}</td>
						<td>
							<input 
							class="form-check-input" 
							type="checkbox" 
							data-id="${periodo.Codigo}"
							${periodo.Mostrar ?? true ? "checked" : ""}>
						</td>
					</tr>`;
					
				periodo.TmpMostrar = periodo.Mostrar;
				
			});
			
		} else if (param == "c") {
		
			// Categorias de uma classificação
			
			const classificacao = 
				_metadados
				.Classificacoes
				.find(x => x.Id == paramId);
			
			titulo = classificacao.Nome;
			
			classificacao.Categorias.forEach((categoria) => {
			
				linhas += `
					<tr>
						<td>${categoria.Id}</td>
						<td>${categoria.Nome}</td>
						<td>
							<input 
							class="form-check-input" 
							type="checkbox" 
							data-id="${categoria.Id}"
							${categoria.Mostrar ?? true ? "checked" : ""}>
						</td>
					</tr>`;
					
				categoria.TmpMostrar = categoria.Mostrar;
			
			});
			
		} else if (param == "n") {
			
			// Unidades de um nível territorial
			
			const nivel = 
				_metadados
				.NiveisTerritoriais
				.find(x => x.Id == $("#bar-form #select-nivel").val());
			
			paramId = nivel.Id;
			
			titulo = nivel.Nome;
			
			nivel.Unidades.forEach((unidade) => {
			
				linhas += `
					<tr>
						<td>${unidade.Codigo}</td>
						<td>${unidade.Nome}</td>
						<td>
							<input 
							class="form-check-input" 
							type="checkbox" 
							data-id="${unidade.Codigo}"
							${unidade.Mostrar ?? true ? "checked" : ""}>
						</td>
					</tr>`;
				
				unidade.TmpMostrar = unidade.Mostrar;
				
			});
		
		}
		
		var html = `
			<table class="table table-striped">
				<thead>
					<tr>
						<th scope="col">Código</th>
						<th scope="col">Nome</th>
						<th scope="col">
							<div class="d-flex align-items-center gap-1">
								<span>Mostrar</span>
								&nbsp;
								<button type="button" class="btn p-0 lh-1" id="btn-all">
									<i class="bi bi-check-square"></i>
								</button>
								&nbsp;
								<button type="button" class="btn p-0 lh-1" id="btn-none">
									<i class="bi bi-x-square"></i>
								</button>
							</div>
						</th>
					</tr>
				</thead>
				<tbody>
					${linhas}
				</tbody>
			</table>`;
		
		$("#modal-toggles").data("form", "heatmap-form");
		$("#modal-toggles").data("param", param);
		$("#modal-toggles").data("param-id", paramId);
		
		$("#modal-toggles .modal-title").html(titulo);
		$("#modal-toggles .modal-body").html(html);
		
		$("#modal-toggles").modal("show");
	
	});
	
}

function heatmapForm() {
	
	var eixoX = heatmapFormX();
	var eixoY = heatmapFormY();
	var variavel = heatmapFormVariável();
	var desagregacoes = heatmapFormDesagregacoes();
	var titulos = heatmapFormTitulos();
	
	var html = `
		<div id="heatmap-form">
			${eixoX}
			${eixoY}
			${variavel}
			<div id="desagregacoes">
				${desagregacoes}
			</div>
			<div id="titulos">
				${titulos}
			</div>
		</div>
	`;
	
	$("#chart-form-wrapper").html(html);
	
	heatmapFormEventSelectEixoX();
	heatmapFormEventSelectEixoY();
	heatmapFormEventSelectNivel();
	heatmapFormEventBtnToggles();
	
}

function heatmapParams() {
	
	var form = "#heatmap-form";
	
	var titulo = $(`${form} #titulo`).val();
	var subtitulo = $(`${form} #subtitulo`).val();
	var tituloX = $(`${form} #titulo-x`).val();
	var tituloY = $(`${form} #titulo-y`).val();
	var paleta = $(`${form} #paleta`).val();
	var variavel = parseInt($(`${form} #select-variavel`).val());
	
	var selectX = $(`${form} #select-eixo-x`);
	var vX = selectX.length ? selectX.val() : null;
	var tX = selectX.length ? selectX.find("option:selected").data("id") : null;
	
	var selectY = $(`${form} #select-eixo-y`);
	var vY = selectY.length ? selectY.val() : null;
	var tY = selectY.length ? selectY.find("option:selected").data("id") : null;
	
	var selectPeriodo = $(`${form} #select-periodo`);
	var selectNivel = $(`${form} #select-nivel-territorial`);
	var selectUnidade = $(`${form} #select-unidade-territorial`);
	
	var selecionadosX = [];
	var selecionadosY = [];
	
	var periodos = [];
	var nivel = null;
	var unidades = null;
	var classificacoes = [];
	
	if (vX == "p") {
		
		selecionadosX = 
			_metadados
			.Periodos
			.filter(x => x.Mostrar ?? true)
			.map(x => x.Codigo);
		
		periodos = selecionadosX;
		
	} else if (vX == "c") {
		
		selecionadosX = 
			_metadados
			.Classificacoes
			.find(x => x.Id == tX)
			.Categorias
			.filter(x => x.Mostrar ?? true)
			.map(x => x.Id);
		
		classificacoes.push({id: tX, categorias: selecionadosX});
		
	} else if (vX == "n") {
		
		selecionadosX = 
			_metadados
			.NiveisTerritoriais
			.find(x => x.Id == tX)
			.Unidades
			.filter(x => x.Mostrar ?? true)
			.map(x => x.Codigo);
		
		nivel = tX;
		unidades = selecionadosX;
		
	}
	
	if (vY == "p") {
		
		selecionadosY = 
			_metadados
			.Periodos
			.filter(x => x.Mostrar ?? true)
			.map(x => x.Codigo);
			
		periodos = selecionadosY;
		
	} else if (vY == "c") {
		
		selecionadosY = 
			_metadados
			.Classificacoes
			.find(x => x.Id == tY)
			.Categorias
			.filter(x => x.Mostrar ?? true)
			.map(x => x.Id);
			
		classificacoes.push({id: tY, categorias: selecionadosY});
		
	} else if (vY == "n") {
		
		selecionadosY = 
			_metadados
			.NiveisTerritoriais
			.find(x => x.Id == tY)
			.Unidades
			.filter(x => x.Mostrar ?? true)
			.map(x => x.Codigo);
		
		nivel = tY;
		unidades = selecionadosY;
		
	}
	
	if (vX != "p" && vY != "p") {
		
		periodos = [selectPeriodo.val()];
		
	}
	
	if (vX != "n" && vY != "n") {
		
		nivel = selectNivel.val();
		unidades = [selectUnidade.val()];
		
	}
	
	_metadados.Classificacoes.forEach((classificacao) => {
		
		if (selectX.length && vX == "c" && tX == classificacao.Id) return;
		if (selectY.length && vY == "c" && tY == classificacao.Id) return;
		
		var categoria = $(`${form} #select-cla-${classificacao.Id}`).val();
		
		classificacoes.push({id: classificacao.Id, categorias: [categoria]});
		
	});
	
	var params = {
		tipo: "heatmap",
		agregado: _metadados.Id,
		x: {
			attr: vX,
			id: tX,
			selecionados: selecionadosX
		},
		y: {
			attr: vY,
			id: tY,
			selecionados: selecionadosY
		},
		variavel,
		periodos,
		nivelTerritorial: nivel,
		unidadesTerritoriais: unidades,
		classificacoes,
		titulo,
		subtitulo,
		tituloX,
		tituloY,
		paleta
	};
	
	return params;
	
}

// Formulário do mapa coroplético

function choroplethFormNivel() {
	
	var niveis = [];
	
	_metadados.NiveisTerritoriais.map((nivel, index) => {
		
		if (nivel.Id >= 2 && nivel.Id <= 3) {
			
			niveis.push(`
				<option value="${nivel.Id}" ${index == 0 ? "selected" : ""}>
					${nivel.Nome}
				</option>
				`);
			
		}
			
	});
	
	var html = `
		<div class="row mb-2">
			<label for="select-nivel" class="col-3 col-lg-2 col-form-label">Nível</label>
			<div class="col">
				<select class="form-select" id="select-nivel">
					${niveis.join("")}
				</select>
			</div>
		</div>`;
	
	return html;
	
}

function choroplethFormPeriodo() {
	
	var periodos = _metadados.Periodos.map((periodo, index) => {
		
		return `
			<option value="${periodo.Codigo}" ${index == 0 ? "selected" : ""}>
				${periodo.Nome}
			</option>`;
			
	});
	
	var html = `
		<div class="row mb-2">
			<label for="select-periodo" class="col-3 col-lg-2 col-form-label">Período</label>
			<div class="col">
				<select class="form-select" id="select-periodo">
					${periodos.join("")}
				</select>
			</div>
		</div>`;
	
	return html;
	
}

function choroplethFormVariável() {
	
	var variaveis = _metadados.Variaveis.map((variavel, index) => {
		
		return `
			<option value="${variavel.Id}" ${index == 0 ? "selected" : ""}>
				${variavel.Nome}
			</option>`;
			
	});
	
	var html = `
		<div class="row mb-2">
			<label for="select-variavel" class="col-3 col-lg-2 col-form-label">Variável</label>
			<div class="col">
				<select class="form-select" id="select-variavel">
					${variaveis.join("")}
				</select>
			</div>
		</div>`;
	
	return html;
	
}

function choroplethFormDesagregacoes() {
	
	var html = "";
	
	_metadados.Classificacoes.forEach((classificacao) => {
		
		var categorias = classificacao.Categorias.map((categoria, index) => {
			
			return `
				<option value="${categoria.Id}" ${index == 0 ? "selected" : ""}>
					${categoria.Nome}
				</option>`;
			
		});
		
		html += `
			<div class="row mb-2">
				<label 
				for="select-cla-${classificacao.Id}" 
				class="col-3 col-lg-2 col-form-label">
					${classificacao.Nome}
				</label>
				<div class="col">
					<select class="form-select" id="select-cla-${classificacao.Id}">
						${categorias.join("")}
					</select>
				</div>
			</div>
			`;
		
	});
	
	return html;

}

function choroplethFormTitulos() {
	
	var paletas = Object.entries(ODSCharts.constants.PALETAS).map(([nome, _]) => {
		
		return `<option value="${nome}">${capitalizar(nome)}</option>`;
		
	});
	
	var html = `
		<!-- TÍTULO DO GRÁFICO -->
		<div class="row mb-2">
			<label for="titulo" class="col-3 col-lg-2 col-form-label">Título</label>
			<div class="col">
				<input type="text" class="form-control" id="titulo" value="${_metadados.Nome}">
			</div>
		</div>
		<!-- SUBTÍTULO DO GRÁFICO -->
		<div class="row mb-2">
			<label for="subtitulo" class="col-3 col-lg-2 col-form-label">Subtítulo</label>
			<div class="col">
				<input 
				type="text" 
				class="form-control" 
				id="subtitulo" 
				value="Fonte: IBGE, ${_metadados.Pesquisa}, SIDRA, Tabela ${_metadados.Id}">
			</div>
		</div>
		<!-- PALETA DE CORES -->
		<div class="row mb-2">
			<label for="paleta" class="col-3 col-lg-2 col-form-label">Paleta de cores</label>
			<div class="col">
				<select class="form-select" id="paleta">
					${paletas}
				</select>
			</div>
		</div>
	`;
	
	return html;

}

function choroplethFormEventSelectVariavel() {
	
	$(document).on("change", "#choropleth-form #select-variavel", function() {
		
		var variavel = 
			_metadados
			.Variaveis
			.find(x => x.Id == $(this).val());
		
		$("#choropleth-form #subtitulo").val(variavel.Nome + " (" + variavel.UnidadeMedida + ")");
		
	});

}

function choroplethForm() {
	
	var nivel = choroplethFormNivel();
	var periodo = choroplethFormPeriodo();
	var variavel = choroplethFormVariável();
	var desagregacoes = choroplethFormDesagregacoes();
	var titulos = choroplethFormTitulos();
	
	var html = `
		<div id="choropleth-form">
			${nivel}
			${periodo}
			${variavel}
			${desagregacoes}
			<div id="titulos">
				${titulos}
			</div>
		</div>
	`;
	
	$("#chart-form-wrapper").html(html);
	
	choroplethFormEventSelectVariavel();
	
}

function choroplethParams() {
	
	var form = "#choropleth-form";
	
	var nivel 	 	= $(`${form} #select-nivel`).val();
	var periodo  	= $(`${form} #select-periodo`).val();
	var variavel 	= $(`${form} #select-variavel`).val();
	
	var titulo 		= $(`${form} #titulo`).val();
	var subtitulo 	= $(`${form} #subtitulo`).val();
	var paleta 		= $(`${form} #paleta`).val();
	
	var classificacoes = _metadados.Classificacoes.map((classificacao) => {
		return {
			id: classificacao.Id, 
			categorias: [ $(`${form} #select-cla-${classificacao.Id}`).val() ]
		};	
	});
	
	var params = {
		tipo: "choropleth",
		agregado: _metadados.Id,
		nivelTerritorial: nivel,
		unidadesTerritoriais: [ "all" ],
		periodos: [ periodo ],
		variavel,
		classificacoes,
		titulo,
		subtitulo,
		paleta
	};
	
	return params;

}

// Atualizações da interface

function atualizarTema(tema) {
	
	const icone = (tema === "dark" ? "bi bi-sun-fill" : "bi bi-moon-stars-fill");
	
	document.documentElement.setAttribute("data-bs-theme", tema);
	
	document.getElementById("btn-theme-icon").className = icone;
	
	localStorage.setItem("ods-chart-maker-theme", tema);
	
}

function atualizarSelectObj() {
	
	var html = "";
	
	var select = $("#select-obj");
	
	_objetivos.forEach((objetivo, index) => {
		
		html += `
			<option value="${objetivo.codigo}" ${index == 0 ? "selected" : ""}>
				Objetivo ${objetivo.codigo} - ${truncar(objetivo.nome, 35)}
			</option>`;
		
	});
	
	select.html(html);
	
}

function atualizarSelectMet() {

	var html = "";
	
	var idObj = $("#select-obj").val();
	var obj = _objetivos.find(x => x.codigo === idObj);
	
	var select = $("#select-met");
	
	obj.metas.forEach((meta, index) => {
		
		html += `
			<option value="${meta.codigo}" ${index == 0 ? "selected" : ""}>
				Meta ${meta.codigo} - ${truncar(meta.nome, 35)}
			</option>`;
		
	});
	
	select.html(html);

}

function atualizarSelectInd() {
	
	var html = "";
	
	var idObj = $("#select-obj").val();
	var obj = _objetivos.find(x => x.codigo === idObj);
	
	var idMet = $("#select-met").val();
	var met = obj.metas.find(x => x.codigo === idMet);
	
	var select = $("#select-ind");
	
	met.indicadores.forEach((indicador, index) => {
		
		html += `
			<option value="${indicador.codigo}" ${index == 0 ? "selected" : ""}>
				Indicador ${indicador.codigo} - ${truncar(indicador.nome, 35)}
			</option>`;
		
	});
	
	select.html(html);

}

function atualizarTitulo(titulo) {

	$("#span-indicador").html(titulo);
	
}

function atualizarGraficos(graficos) {
	
	var html = "";
	
	if (graficos.length == 0) {
		
		html += `
			<div class="row my-5">
				<div class="col">
					<div class="bg-warning-subtle text-warning-emphasis chart-placeholder">
						Este indicador não possui gráficos cadastrados!
					</div>		
				</div>
			</div>
		`;
		
	}
	
	graficos.forEach((params, index) => {
		
		html += `
			<div class="row my-5">
				<div class="col">
					<div class="bg-body-tertiary border rounded p-5 text-center">
						<div class="page-chart" id="chart-${index}">
							<div class="chart-spinner"></div>
						</div>
						<div class="mt-5">
							<button 
							type="button" 
							class="btn btn-sm btn-secondary btn-up"
							data-idx="${index}">
								<i class="bi bi-arrow-up-circle"></i>
							</button>
							<button 
							type="button" 
							class="btn btn-sm btn-secondary btn-down"
							data-idx="${index}">
								<i class="bi bi-arrow-down-circle"></i>
							</button>
							<button 
							type="button" 
							class="btn btn-sm btn-secondary btn-trash"
							data-idx="${index}">
								<i class="bi bi-trash3"></i>
							</button>
						</div>
					</div>
				</div>
			</div>
			`;
		
	});
	
	$("#charts-wrapper").html(html);
	
	graficos.forEach((params, index) => {
		
		ODSCharts[params.tipo](`chart-${index}`, params).then((_) => { 
			
			$(`#chart-${index} .chart-spinner`).remove(); 
			
		});
		
	});
	
}

function atualizarPagina(callback) {
	
	var obj = _objetivos.find(x => x.codigo === $("#select-obj").val());
	var met = obj.metas.find(x => x.codigo === $("#select-met").val());
	var ind = met.indicadores.find(x => x.codigo === $("#select-ind").val());
	
	if (ind.graficos) {
		
		atualizarTitulo(`Indicador ${ind.codigo}`);
		atualizarGraficos(ind.graficos);
		
		if (typeof callback === "function") {
			
			callback();
			
		}
		
	} else {
		
		const url = `graficos/${ind.codigo}.json`;
		
		$.ajax({
			url: url,
			method: "GET",
			dataType: "json",
			success: function (graficos) {
				
				ind.graficos = graficos;
				
			},
			error: function(jqXHR, textStatus, errorThrown) {
				
				ind.graficos = [];
				
			},
			complete: async function() {
				
				atualizarTitulo(`Indicador ${ind.codigo}`);
				atualizarGraficos(ind.graficos);
				
				if (typeof callback === "function") {
					
					callback();
					
				}
				
			}
		});
		
	}
	
}

function atualizarMetadados(metadados) {
	
	var variaveis = ``;
	var classificacoes = ``;
	var periodos = ``;
	var niveis = ``;
	
	metadados.Variaveis.forEach((variavel) => {
	
		variaveis += `
			<div class="row">
				<div class="col">
					${variavel.Id} - ${variavel.Nome}
				</div>
			</div>
		`;
	
	});
	
	metadados.Classificacoes.forEach((classificacao) => {
	
		classificacoes += `
			<div class="row">
				<div class="col">
					${classificacao.Id} - ${classificacao.Nome}
				</div>
			</div>
		`;
	
	});
	
	periodos += `
		<div class="row">
			<div class="col">
				${metadados.Periodos.map(x => x.Nome).join(', ')}
			</div>
		</div>
	`;
	
	metadados.NiveisTerritoriais.forEach((nivel) => {
	
		niveis += `
			<div class="row">
				<div class="col">
					${nivel.Id} - ${nivel.Nome}
				</div>
			</div>
		`;
	
	});
	
	$("#metadados-wrapper #codigo").html(metadados.Id);
	$("#metadados-wrapper #nome").html(metadados.Nome);
	$("#metadados-wrapper #variaveis").html(variaveis);
	$("#metadados-wrapper #classificacoes").html(classificacoes.length == 0 ? "-" : classificacoes);
	$("#metadados-wrapper #periodos").html(periodos);
	$("#metadados-wrapper #niveis").html(niveis);
	
}

function atualizarSelectTipos(metadados) {
	
	var temGR = metadados.NiveisTerritoriais.some(x => x.Id == 2);
	var temUF = metadados.NiveisTerritoriais.some(x => x.Id == 3);
	
	var html = ``;
	
	html += `<option value="line">Linha</option>`;
	html += `<option value="bar">Barra</option>`;
	html += `<option value="heatmap">Heatmap</option>`;
	
	if (temGR == true || temUF == true) {
	
		html += `<option value="choropleth">Mapa coroplético</option>`;
	
	}
	
	$("#select-tipo").html(html);
	$("#select-tipo").prop("disabled", false);
	
	$("#btn-plot").prop("disabled", false);
	$("#btn-copy").prop("disabled", false);
	$("#btn-add").prop("disabled", false);
	
}

function atualizarChartForm() {
	
	const tipo = $("#select-tipo").val();
	
	const funcs = {
		line: lineForm,
		bar: barForm,
		heatmap: heatmapForm,
		choropleth: choroplethForm
	};
	
	$("#chart-form-wrapper").html("");
	
	funcs[tipo]();
	
}

// Configurações do header e seus elementos

function configurarSelectObj() {
	
	atualizarSelectObj();
	
	$(document).on("change", "#select-obj", function() {
		
		atualizarSelectMet();
		atualizarSelectInd();
		
	});
	
}

function configurarSelectMet() {
	
	atualizarSelectMet();
	
	$(document).on("change", "#select-met", function() {
		
		atualizarSelectInd();
		
	});
	
}

function configurarSelectInd() {
	
	atualizarSelectInd();
	
}

function configurarBtnIndicador() {
	
	$(document).on("click", "#btn-indicador", function() {
		
		const btn = $(this);
		const html = btn.html();
		
		btn.html(`<div class="btn-spinner"></div>`);
		btn.prop("disabled", true).addClass("disabled");
		
		atualizarPagina(() => {
			
			btn.html(html);
			btn.prop("disabled", false).removeClass("disabled");
			
			if ($("#filtros").hasClass("show")) {
				
				bootstrap.Collapse.getOrCreateInstance($('#filtros')[0]).hide();
				
			}
			
		});
		
	});
	
}

// Configurações dos botões que aparecem abaixo de cada gráfico da página

function configurarBtnUp() {
	
	$(document).on("click", ".btn-up", function() {
		
		const obj = _objetivos.find(x => x.codigo === $("#select-obj").val());
		const met = obj.metas.find(x => x.codigo === $("#select-met").val());
		const ind = met.indicadores.find(x => x.codigo === $("#select-ind").val());
		
		const idx = $(this).data("idx");
		
		if (idx > 0) {
			
			[ind.graficos[idx], ind.graficos[idx - 1]] = [ind.graficos[idx - 1], ind.graficos[idx]];
			
			atualizarGraficos(ind.graficos);
			
		}
		
	});
	
}

function configurarBtnDown() {
	
	$(document).on("click", ".btn-down", function() {
		
		const obj = _objetivos.find(x => x.codigo === $("#select-obj").val());
		const met = obj.metas.find(x => x.codigo === $("#select-met").val());
		const ind = met.indicadores.find(x => x.codigo === $("#select-ind").val());
		
		const idx = $(this).data("idx");
		
		if (idx < (ind.graficos.length - 1)) {
			
			[ind.graficos[idx], ind.graficos[idx + 1]] = [ind.graficos[idx + 1], ind.graficos[idx]];
			
			atualizarGraficos(ind.graficos);
			
		}
		
	});
	
}

function configurarBtnTrash() {
	
	$(document).on("click", ".btn-trash", function() {
		
		const obj = _objetivos.find(x => x.codigo === $("#select-obj").val());
		const met = obj.metas.find(x => x.codigo === $("#select-met").val());
		const ind = met.indicadores.find(x => x.codigo === $("#select-ind").val());
		
		const idx = $(this).data("idx");
		
		ind.graficos.splice(idx, 1);
		
		if (ind.graficos.length > 0) {
			
			atualizarGraficos(ind.graficos);
			
		} else {
			
			atualizarGraficos([]);
			
		}
		
	});
	
}

// Configurações dos botões flutuantes que ficam no canto direito inferior da página

function configurarBtnDownload() {
	
	$(document).on("click", "#btn-download", function() {
		
		var obj = _objetivos.find(x => x.codigo === $("#select-obj").val());
		var met = obj.metas.find(x => x.codigo === $("#select-met").val());
		var ind = met.indicadores.find(x => x.codigo === $("#select-ind").val());
		
		const json = JSON.stringify(ind.graficos, null, 2);
		const arquivo = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(arquivo);
		
		const link = document.createElement("a");
		
		link.href = url;
		link.download = `${ind.codigo}.json`;;
		link.click();
		
		URL.revokeObjectURL(url);
		
	});
	
}

function configurarBtnPreview() {
	
	$(document).on("click", "#btn-preview", function() {
		
		var obj = _objetivos.find(x => x.codigo === $("#select-obj").val());
		var met = obj.metas.find(x => x.codigo === $("#select-met").val());
		var ind = met.indicadores.find(x => x.codigo === $("#select-ind").val());
		
		window.open(`http://localhost:9000/preview.html?indicador=${ind.codigo}`, "_blank");
		
	});
	
}

function configurarBtnTheme() {
	
	$(document).on("click", "#btn-theme", function() {
		
		const atual = document.documentElement.getAttribute("data-bs-theme");
		const novo = (atual === "dark" ? "light" : "dark");
		
		atualizarTema(novo);
		
	});
	
}

// Configurações do formulário de criação

function configurarBtnLoad() {
	
	$(document).on("click", "#btn-load", function() {
		
		const inputAgregado = $("#input-agregado");
		const loadBtn = $("#btn-load");
		const loadBtnHtml = loadBtn.html();
		
		const codigo = inputAgregado.val();
		const url = `https://apisidra.ibge.gov.br/DescritoresTabela/t/${codigo}`;
		
		inputAgregado.val("");
		
		loadBtn.html(`<div class="btn-spinner"></div>`);
		loadBtn.prop("disabled", true).addClass("disabled");
		
		$.ajax({
			url: url,
			method: "GET",
			dataType: "json",
			success: function (metadados) {
				
				_metadados = metadados;
				
				ODSCharts.utils.agregarUnidades(metadados);
				
				atualizarMetadados(metadados);
				atualizarSelectTipos(metadados);
				atualizarChartForm();
				
			},
			complete: async function() {
				
				loadBtn.html(loadBtnHtml);
				loadBtn.prop("disabled", false).removeClass("disabled");
				
			}
		});
		
	});
	
}

function configurarSelectTipo() {
	
	$("#select-tipo").change(function() {
		
		atualizarChartForm();
		
	});
	
}

function configurarBtnPlot() {
	
	$(document).on("click", "#btn-plot", function() {
		
		const btn = $(this);
		const btnHtml = btn.html();
		
		const tipo = $("#select-tipo").val();
		
		const funcs = {
			line: lineParams,
			bar: barParams,
			heatmap: heatmapParams,
			choropleth: choroplethParams
		};
		
		$("#maker-chart").css("display", "block");
		$("#maker-chart-placeholder").css("display", "none");
		
		btn.html(`<div class="btn-spinner"></div>`);
		btn.prop("disabled", true).addClass("disabled");
		
		_params = funcs[tipo]();
		
		ODSCharts[tipo]("maker-chart", _params).then((_) => { 
			
			btn.html(btnHtml);
			btn.prop("disabled", false).removeClass("disabled");
			
		});
		
	});
	
}

function configurarBtnCopy() {
	
	$(document).on("click", "#btn-copy", function() {
		
		try {
			
			navigator.clipboard.writeText(JSON.stringify(_params, null, 4));
			
		} catch (err) {
		
			// ...
		
		}
		
	});
	
}

function configurarBtnAdd() {
	
	$(document).on("click", "#btn-add", function() {
		
		var obj = _objetivos.find(x => x.codigo === $("#select-obj").val());
		var met = obj.metas.find(x => x.codigo === $("#select-met").val());
		var ind = met.indicadores.find(x => x.codigo === $("#select-ind").val());
		
		ind.graficos.push(_params);
		
		atualizarGraficos(ind.graficos);
		
	});
	
}

// Configurações do modal de toggles

function configurarBtnAll() {
	
	$(document).on("click", "#modal-toggles #btn-all", function() {
		
		const param = $("#modal-toggles").data("param");
		const paramId = $("#modal-toggles").data("param-id");
		
		if (param == "p") {
			
			_metadados
			.Periodos
			.forEach(x => { x.TmpMostrar = true; });
			
		} else if (param == "c") {
			
			_metadados
			.Classificacoes
			.find(x => x.Id == paramId)
			.Categorias
			.forEach(x => { x.TmpMostrar = true; });
			
		} else if (param == "n") {
		
			_metadados
			.NiveisTerritoriais
			.find(x => x.Id == paramId)
			.Unidades
			.forEach(x => { x.TmpMostrar = true; });
			
		}
		
		$("#modal-toggles .form-check-input").prop("checked", true);
		
	});
	
}

function configurarBtnNone() {
	
	$(document).on("click", "#modal-toggles #btn-none", function() {
		
		const param = $("#modal-toggles").data("param");
		const paramId = $("#modal-toggles").data("param-id");
		
		if (param == "p") {
			
			_metadados
			.Periodos
			.forEach(x => { x.TmpMostrar = false; });
			
		} else if (param == "c") {
			
			_metadados
			.Classificacoes
			.find(x => x.Id == paramId)
			.Categorias
			.forEach(x => { x.TmpMostrar = false; });
			
		} else if (param == "n") {
		
			_metadados
			.NiveisTerritoriais
			.find(x => x.Id == paramId)
			.Unidades
			.forEach(x => { x.TmpMostrar = false; });
			
		}
	
		$("#modal-toggles .form-check-input").prop("checked", false);
		
	});
	
}

function configurarToggles() {
	
	$(document).on("change", "#modal-toggles .form-check-input", function() {
		
		const param = $("#modal-toggles").data("param");
		const paramId = $("#modal-toggles").data("param-id");
		
		const id = $(this).data("id");
		const mostrar = $(this).prop("checked");
		
		if (param == "p") {
			
			_metadados
			.Periodos
			.find(x => x.Codigo == id)
			.TmpMostrar = mostrar;
			
		} else if (param == "c") {
			
			_metadados
			.Classificacoes
			.find(x => x.Id == paramId)
			.Categorias
			.find(x => x.Id == id)
			.TmpMostrar = mostrar;
			
		} else if (param == "n") {
		
			_metadados
			.NiveisTerritoriais
			.find(x => x.Id == paramId)
			.Unidades
			.find(x => x.Codigo == id)
			.TmpMostrar = mostrar;
			
		}
		
	});
	
}

function configurarBtnSave() {
	
	$(document).on("click", "#modal-toggles-btn-save", function() {
		
		const formId = $("#modal-toggles").data("form");
		const param = $("#modal-toggles").data("param");
		const paramId = $("#modal-toggles").data("param-id");
		
		if (param == "p") {
			
			var qnt = 
				_metadados
				.Periodos
				.filter(x => x.TmpMostrar ?? true)
				.length;
			
			if (qnt == 0) {
			
				$("#modal-toggles-span-error").html("Erro: Selecione pelo menos um item!");
				
				return;
			
			}
			
			_metadados
			.Periodos
			.forEach(x => { x.Mostrar = x.TmpMostrar; });
			
			var periodos = 
				_metadados
				.Periodos
				.filter(x => x.Mostrar ?? true)
				.map((x) => x.Nome);
			
			var subtexto = truncar(periodos.join(", "), 35);
			
			if (formId == "heatmap-form") {
				
				var vX = $(`#${formId} #select-eixo-x`).val();
				var vY = $(`#${formId} #select-eixo-x`).val();
				
				if (vX == "p") {
					
					$(`#${formId} #subtexto-eixo-x`).html(subtexto);
					
				}
				
				if (vY == "p") {
					
					$(`#${formId} #subtexto-eixo-y`).html(subtexto);
					
				}
				
			} else {
				
				$(`#${formId} #subtexto-eixo-x`).html(subtexto);
				
			}
			
		} else if (param == "c") {
		
			var qnt = 
				_metadados
				.Classificacoes
				.find(x => x.Id == paramId)
				.Categorias
				.filter(x => x.TmpMostrar ?? true)
				.length;
			
			if (qnt == 0) {
			
				$("#modal-toggles-span-error").html("Erro: Selecione pelo menos um item!");
				
				return;
			
			}
			
			_metadados
			.Classificacoes
			.find(x => x.Id == paramId)
			.Categorias
			.forEach(x => { x.Mostrar = x.TmpMostrar; });
			
			var categorias = 
				_metadados
				.Classificacoes
				.find(x => x.Id == paramId)
				.Categorias
				.filter(x => x.Mostrar ?? true)
				.map(x => x.Nome);
				
			var subtexto = truncar(categorias.join(", "), 35);
			
			$(`#${formId} #subtexto-c-${paramId}`).html(subtexto);
			
		} else if (param == "n") {
		
			var qnt = 
				_metadados
				.NiveisTerritoriais
				.find(x => x.Id == paramId)
				.Unidades
				.filter(x => x.TmpMostrar ?? true)
				.length;
			
			if (qnt == 0) {
			
				$("#modal-toggles-span-error").html("Erro: Selecione pelo menos um item!");
				
				return;
			
			}
			
			_metadados
			.NiveisTerritoriais
			.find(x => x.Id == paramId)
			.Unidades
			.forEach(x => { x.Mostrar = x.TmpMostrar; });
			
			var unidades = 
				_metadados
				.NiveisTerritoriais
				.find(x => x.Id == paramId)
				.Unidades
				.filter(x => x.Mostrar ?? true)
				.map(x => x.Nome);
				
			var subtexto = truncar(unidades.join(", "), 35);
			
			$(`#${formId} #subtexto-nivel-territorial`).html(subtexto);
			
		}
		
		$("#modal-toggles").modal("hide");
		
	});
	
}

function configurarModalHide() {
	
	$("#modal-toggles").on("hide.bs.modal", function() {
		
		$("#modal-toggles-span-error").html("");
		
	});
	
}

// Baixa o json contendo a estrutura dos ods e configura a página

$(document).ready(function () {
	
	$.ajax({
		url: "ods.json",
		method: "GET",
		dataType: "json",
		success: function (objetivos) {
			
			_objetivos = objetivos;
			
			configurarSelectObj();
			configurarSelectMet();
			configurarSelectInd();
			configurarBtnIndicador();
			
			configurarBtnUp();
			configurarBtnDown();
			configurarBtnTrash();
			
			configurarBtnDownload();
			configurarBtnPreview();
			configurarBtnTheme();
			
			configurarBtnLoad();
			configurarSelectTipo();
			configurarBtnPlot();
			configurarBtnCopy();
			configurarBtnAdd();
			
			configurarBtnAll();
			configurarBtnNone();
			configurarToggles();
			configurarBtnSave();
			configurarModalHide();
			
			atualizarPagina();
			
		}
	});
	
	atualizarTema(localStorage.getItem("ods-chart-maker-theme") || "light");
	
});