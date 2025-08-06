/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 320, height: 300 });

async function loadRequiredFonts() {
  try {
    await Promise.all([
      figma.loadFontAsync({ family: "Inter", style: "Bold" }),
      figma.loadFontAsync({ family: "Inter", style: "Regular" }),
      figma.loadFontAsync({ family: "Inter", style: "Medium" }),
      figma.loadFontAsync({ family: "Roboto Mono", style: "Regular" }) // ✅ Para code snippets
    ]);
    console.log('Fontes Inter e Roboto Mono carregadas com sucesso');
  } catch (error) {
    console.error('Erro ao carregar fontes:', error);
    await Promise.all([
      figma.loadFontAsync({ family: "Roboto", style: "Bold" }),
      figma.loadFontAsync({ family: "Roboto", style: "Regular" }),
      figma.loadFontAsync({ family: "Roboto", style: "Medium" })
    ]);
    console.log('Usando Roboto como fallback');
  }
}

// Função para organizar dados por categoria e subcategoria
function organizeDataByCategory(data: string[][], componentName: string) {
  const filtered = data.filter(row => row[0] && row[0].trim() === componentName.trim());
  
  const organized: { [category: string]: { [subCategory: string]: string[] } } = {};
  
  for (const row of filtered) {
    const category = row[1] || '';
    const subCategory = row[2] || 'Main Content';
    const guideline = row[3] || '';

    if (!category || category === '2. Props') continue;
    
    if (!organized[category]) {
      organized[category] = {};
    }
    
    if (!organized[category][subCategory]) {
      organized[category][subCategory] = [];
    }
    
    if (guideline) {
      organized[category][subCategory].push(guideline);
    }
  }
  
  console.log('Organized data:', organized);
  return organized;
}

// Função para criar linha divisória
function createDividerLine(): FrameNode {
  const line = figma.createFrame();
  line.name = "Divider";
  line.resize(100, 2);
  line.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  // ✅ Removido layoutSizingHorizontal - será definido apenas quando adicionado ao frame pai
  return line;
}

// Função para criar placeholder de imagem
function createImagePlaceholder(): FrameNode {
  const placeholder = figma.createFrame();
  placeholder.name = "Image Placeholder";
  placeholder.resize(160, 160);
  placeholder.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
  placeholder.strokeWeight = 1;
  placeholder.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
  
  // Adicionar texto "Image"
  const text = figma.createText();
  text.characters = "Image";
  text.fontSize = 14;
  text.fontName = { family: "Inter", style: "Regular" };
  text.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
  text.textAlignHorizontal = 'CENTER';
  text.textAlignVertical = 'CENTER';
  text.resize(160, 160);
  
  placeholder.appendChild(text);
  return placeholder;
}

// Função para criar texto com suporte a markdown **bold**, ``code`` e bullet list (CORRIGIDA)
async function createSimpleText(content: string, fontSize: number, fontStyle: string, isBulletPoint: boolean = false): Promise<TextNode> {
  const textNode = figma.createText();
  
  // Primeiro, remover o markdown e criar o texto limpo
  let cleanContent = content.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove **bold**
  cleanContent = cleanContent.replace(/`(.*?)`/g, '$1'); // Remove `code`
  
  // Se for bullet point, não adicionar "•" - usar funcionalidade nativa do Figma
  if (isBulletPoint) {
    cleanContent = cleanContent.replace(/^• /, '');
  }
  
  textNode.characters = cleanContent;
  textNode.fontSize = fontSize;
  textNode.fontName = { family: "Inter", style: fontStyle as any };
  textNode.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  textNode.textAutoResize = 'HEIGHT';
  
  // Aplicar bullet list nativo do Figma
  if (isBulletPoint) {
    textNode.setRangeListOptions(0, textNode.characters.length, { type: 'UNORDERED' });
  }
  
  // ✅ NOVA ABORDAGEM: Processar ambos os tipos de formatação juntos
  // Criar array de formatações para aplicar na ordem correta
  const formatRanges: Array<{
    start: number;
    end: number;
    type: 'bold' | 'code';
    text: string;
  }> = [];
  
  // ✅ 1. Encontrar todas as formatações BOLD no texto original
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match;
  
  boldRegex.lastIndex = 0;
  while ((match = boldRegex.exec(content)) !== null) {
    formatRanges.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'bold',
      text: match[1]
    });
  }
  
  // ✅ 2. Encontrar todas as formatações CODE no texto original
  const codeRegex = /`(.*?)`/g;
  
  codeRegex.lastIndex = 0;
  while ((match = codeRegex.exec(content)) !== null) {
    formatRanges.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'code',
      text: match[1]
    });
  }
  
  // ✅ 3. Ordenar por posição (do início para o fim)
  formatRanges.sort((a, b) => a.start - b.start);
  
  // ✅ 4. Aplicar formatações calculando offset acumulativo
  let offset = 0;
  
  for (const range of formatRanges) {
    // Calcular posição no texto limpo
    const cleanStart = range.start - offset;
    const cleanEnd = cleanStart + range.text.length;
    
    try {
      if (range.type === 'bold') {
        // Aplicar negrito
        textNode.setRangeFontName(cleanStart, cleanEnd, { family: "Inter", style: "Bold" });
        // Atualizar offset: **texto** = 4 caracteres removidos
        offset += 4;
      } else if (range.type === 'code') {
        // Aplicar formatação de código
        textNode.setRangeFontName(cleanStart, cleanEnd, { family: "Roboto Mono", style: "Regular" });
        textNode.setRangeFills(cleanStart, cleanEnd, [{ 
          type: 'SOLID', 
          color: { r: 0.8, g: 0.2, b: 0.6 }
        }]);
        // Atualizar offset: `texto` = 2 caracteres removidos
        offset += 2;
      }
    } catch (error) {
      console.warn(`Erro ao aplicar formatação ${range.type}:`, error);
      
      // Fallback para code
      if (range.type === 'code') {
        try {
          textNode.setRangeFontName(cleanStart, cleanEnd, { family: "Inter", style: "Regular" });
          textNode.setRangeFills(cleanStart, cleanEnd, [{ 
            type: 'SOLID', 
            color: { r: 0.8, g: 0.2, b: 0.6 }
          }]);
        } catch (fallbackError) {
          console.warn('Erro no fallback de código:', fallbackError);
        }
      }
    }
  }
  
  return textNode;
}

// Função principal para criar o layout estruturado
async function createStructuredDocumentation(data: string[][], componentName: string, mainFrame: FrameNode) {
  const organizedData = organizeDataByCategory(data, componentName);
  
  console.log('Organized data:', organizedData);
  
  for (const categoryName in organizedData) {
    const subCategories = organizedData[categoryName];
    
    console.log('Processing category:', categoryName);
    
    // 1. Criar frame da categoria
    const categoryFrame = figma.createFrame();
    categoryFrame.name = `Category: ${categoryName}`;
    categoryFrame.layoutMode = 'VERTICAL';
    categoryFrame.counterAxisSizingMode = 'AUTO';
    categoryFrame.itemSpacing = 40; // ✅ 40px entre Title & Divider e SubCategories
    categoryFrame.fills = [];
    
    // ✅ 1.1 Criar frame para título + divider
    const titleDividerFrame = figma.createFrame();
    titleDividerFrame.name = "Title & Divider";
    titleDividerFrame.layoutMode = 'VERTICAL';
    titleDividerFrame.counterAxisSizingMode = 'AUTO';
    titleDividerFrame.itemSpacing = 16; // ✅ 16px entre título e divider
    titleDividerFrame.fills = [];
    
    // 1.2 Título da categoria (H2)
    const categoryTitle = await createSimpleText(categoryName, 24, "Bold");
    titleDividerFrame.appendChild(categoryTitle);
    categoryTitle.layoutSizingHorizontal = 'FILL';
    
    // 1.3 Linha divisória
    const divider = createDividerLine();
    titleDividerFrame.appendChild(divider);
    divider.layoutSizingHorizontal = 'FILL';
    
    // ✅ Adicionar o frame título+divider ao categoryFrame
    categoryFrame.appendChild(titleDividerFrame);
    titleDividerFrame.layoutSizingHorizontal = 'FILL';
    
    // ✅ 2. Criar frame para agrupar todas as subcategorias
    const subCategoriesFrame = figma.createFrame();
    subCategoriesFrame.name = "SubCategories";
    subCategoriesFrame.layoutMode = 'VERTICAL';
    subCategoriesFrame.counterAxisSizingMode = 'AUTO';
    subCategoriesFrame.itemSpacing = 64; // ✅ 64px entre cada subcategoria
    subCategoriesFrame.fills = [];
    
    // 3. Processar subcategorias
    for (const subCategoryName in subCategories) {
      const guidelines = subCategories[subCategoryName];
      
      console.log('Processing subcategory:', subCategoryName, 'Guidelines:', guidelines.length);
      
      if (guidelines.length === 0) continue;
      
      // Para "Main Content" (Description), não mostrar layout com imagem
      if (subCategoryName === 'Main Content') {
        // Layout simples só com texto
        const descriptionFrame = figma.createFrame();
        descriptionFrame.name = "Description";
        descriptionFrame.layoutMode = 'VERTICAL';
        descriptionFrame.counterAxisSizingMode = 'AUTO';
        descriptionFrame.itemSpacing = 24;
        descriptionFrame.fills = [];
        
        for (const guideline of guidelines) {
          if (!guideline.trim()) continue;
          const text = await createSimpleText(guideline, 24, "Regular");
          descriptionFrame.appendChild(text);
          text.layoutSizingHorizontal = 'FILL';
        }
        
        // ✅ Adicionar ao frame de subcategorias
        subCategoriesFrame.appendChild(descriptionFrame);
        descriptionFrame.layoutSizingHorizontal = 'FILL';
        continue;
      }
      
      // Layout normal com imagem para outras subcategorias
      const subCategoryFrame = figma.createFrame();
      subCategoryFrame.name = `SubCategory: ${subCategoryName}`;
      subCategoryFrame.layoutMode = 'HORIZONTAL';
      subCategoryFrame.counterAxisSizingMode = 'AUTO';
      subCategoryFrame.itemSpacing = 72; // Espaçamento entre texto e imagem
      subCategoryFrame.fills = [];
      
      // Frame esquerdo (conteúdo)
      const contentFrame = figma.createFrame();
      contentFrame.name = "Content";
      contentFrame.layoutMode = 'VERTICAL';
      contentFrame.counterAxisSizingMode = 'AUTO';
      contentFrame.itemSpacing = 16; // Espaçamento entre título e bullet points
      contentFrame.fills = [];
      
      // ✅ Título da subcategoria (H3) - Bold
      if (subCategoryName.trim()) {
        const subCategoryTitle = await createSimpleText(subCategoryName, 18, "Bold");
        contentFrame.appendChild(subCategoryTitle);
        subCategoryTitle.layoutSizingHorizontal = 'FILL';
      }
      
      // Guidelines como bullet points
      for (const guideline of guidelines) {
        if (!guideline.trim()) continue;
        
        // ✅ Usar bullet list nativo - removido o "• " e adicionado parâmetro true
        const bulletText = await createSimpleText(guideline, 14, "Regular", true);
        contentFrame.appendChild(bulletText);
        bulletText.layoutSizingHorizontal = 'FILL';
      }
      
      // Placeholder de imagem (direita)
      const imagePlaceholder = createImagePlaceholder();
      
      // Adicionar frames ao layout
      subCategoryFrame.appendChild(contentFrame);
      subCategoryFrame.appendChild(imagePlaceholder);
      contentFrame.layoutSizingHorizontal = 'FILL';
      
      // ✅ Adicionar subcategoria ao frame de subcategorias
      subCategoriesFrame.appendChild(subCategoryFrame);
      subCategoryFrame.layoutSizingHorizontal = 'FILL';
    }
    
    // ✅ Adicionar frame de subcategorias à categoria (se não estiver vazio)
    if (subCategoriesFrame.children.length > 0) {
      categoryFrame.appendChild(subCategoriesFrame);
      subCategoriesFrame.layoutSizingHorizontal = 'FILL';
    }
    
    // Adicionar categoria ao frame principal
    mainFrame.appendChild(categoryFrame);
    categoryFrame.layoutSizingHorizontal = 'FILL';
  }
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'create-doc') {
    const { component, data } = msg;
    
    console.log('Component:', component);
    console.log('Data rows:', data.length);
    
    // CARREGUE AS FONTES PRIMEIRO
    await loadRequiredFonts();

    // Criar o frame principal com largura fixa de 988px
    const mainFrame = figma.createFrame();
    mainFrame.name = `UI Docs: ${component}`;
    mainFrame.resize(988, 100);
    mainFrame.layoutMode = 'VERTICAL';
    mainFrame.counterAxisSizingMode = 'AUTO';
    mainFrame.itemSpacing = 72;
    mainFrame.paddingLeft = 48;
    mainFrame.paddingRight = 48;
    mainFrame.paddingTop = 48;
    mainFrame.paddingBottom = 48;
    mainFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

    try {
      // ✅ Criar cabeçalho SEM auto-layout (HUG)
      const headerFrame = figma.createFrame();
      headerFrame.name = "Header";
      headerFrame.fills = [];
      
      // Título principal
      const title = await createSimpleText("UI Guidelines", 48, "Bold");
      title.x = 0;
      title.y = 0;
      headerFrame.appendChild(title);

      // Subtítulo com nome do componente
      const subtitle = await createSimpleText(component, 32, "Medium");
      subtitle.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
      subtitle.x = 0;
      subtitle.y = title.height + 16;
      headerFrame.appendChild(subtitle);

      // Ajustar tamanho do headerFrame (HUG)
      headerFrame.resize(Math.max(title.width, subtitle.width), title.height + 16 + subtitle.height);

      mainFrame.appendChild(headerFrame);
      // ❌ Header NÃO tem FILL (fica HUG)

      // ✅ Criar documentação estruturada (categoryFrames com FILL)
      await createStructuredDocumentation(data, component, mainFrame);

      // Adicionar à página e focar
      figma.currentPage.appendChild(mainFrame);
      figma.viewport.scrollAndZoomIntoView([mainFrame]);
      
    } catch (error) {
      console.error('Erro ao criar frame:', error);
    }
  }
};
