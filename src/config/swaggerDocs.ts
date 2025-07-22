import fs from 'fs';
import path from 'path';

/**
 * Reads and converts markdown documentation to HTML for Swagger UI
 */
export const getMarkdownDocs = async (): Promise<Record<string, string>> => {
	const { marked } = await import('marked');
	const docsDir = path.join(__dirname, '../docs');
	const docs: Record<string, string> = {};

	try {
		// Check if docs directory exists
		if (fs.existsSync(docsDir)) {
			// Read all markdown files
			const files = fs.readdirSync(docsDir).filter(file => file.endsWith('.md'));

			// Convert each markdown file to HTML
			for (const file of files) {
				const filePath = path.join(docsDir, file);
				const content = fs.readFileSync(filePath, 'utf8');
				const html = marked.parse(content);
				const name = path.basename(file, '.md');
				docs[name] = html as string;
			}
		}
	} catch (error) {
		console.error('Error loading markdown documentation:', error);
	}

	return docs;
};

/**
 * Generates custom HTML for Swagger UI documentation
 */
export const generateSwaggerHtml = (docs: Record<string, string>): string => {
	let html = '';

	// Add each documentation section
	for (const [name, content] of Object.entries(docs)) {
		html += `
      <div class="doc-section">
        <h2>${name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h2>
        ${content}
      </div>
    `;
	}

	return html;
};

/**
 * Custom CSS for documentation
 */
export const swaggerCustomCss = `
  .swagger-ui .topbar { display: none }
  .doc-section {
    padding: 20px;
    margin-bottom: 20px;
    background-color: #fff;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }
  .doc-section h2 {
    color: #3b4151;
    font-weight: 600;
    margin-bottom: 15px;
  }
  .doc-section table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 20px;
  }
  .doc-section th, .doc-section td {
    border: 1px solid #ddd;
    padding: 8px 12px;
    text-align: left;
  }
  .doc-section th {
    background-color: #f2f2f2;
  }
  .doc-section code {
    background-color: #f2f2f2;
    padding: 2px 5px;
    border-radius: 3px;
    font-family: monospace;
  }
  .doc-section pre {
    background-color: #f2f2f2;
    padding: 10px;
    border-radius: 3px;
    overflow-x: auto;
  }
`;