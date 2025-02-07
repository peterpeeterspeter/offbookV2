import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

// Initialize pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export class DocumentParser {
  /**
   * Parse a PDF file and return its text content
   */
  public async parsePDF(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      
      let fullText = ''
      
      // Iterate through each page
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map(item => 'str' in item ? item.str : '')
          .join(' ')
        
        fullText += pageText + '\n\n'
      }
      
      return this.cleanText(fullText)
    } catch (error) {
      console.error('Error parsing PDF:', error)
      throw new Error('Failed to parse PDF file')
    }
  }

  /**
   * Parse a Word document and return its text content
   */
  public async parseWord(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      return this.cleanText(result.value)
    } catch (error) {
      console.error('Error parsing Word document:', error)
      throw new Error('Failed to parse Word document')
    }
  }

  /**
   * Clean and format the extracted text
   */
  private cleanText(text: string): string {
    return text
      // Remove multiple consecutive spaces
      .replace(/\s+/g, ' ')
      // Remove multiple consecutive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Remove trailing/leading whitespace
      .trim()
  }

  /**
   * Parse any supported document type
   */
  public async parseDocument(file: File): Promise<string> {
    const fileType = file.type.toLowerCase()
    
    switch (fileType) {
      case 'application/pdf':
        return this.parsePDF(file)
      
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.parseWord(file)
      
      case 'text/plain':
        return file.text()
      
      default:
        throw new Error(`Unsupported file type: ${fileType}`)
    }
  }
}

export const documentParser = new DocumentParser() 