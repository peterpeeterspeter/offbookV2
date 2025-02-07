from fpdf import FPDF
from pathlib import Path

def create_test_pdf():
    # Initialize PDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    
    # Read text file
    text_path = Path(__file__).parent / "data" / "test_script.txt"
    with open(text_path, "r") as f:
        lines = f.readlines()
    
    # Write content to PDF
    line_height = 8
    for line in lines:
        if line.strip():  # Skip empty lines
            if line.startswith("ROMEO") or line.startswith("JULIET"):
                pdf.set_font("Helvetica", "B", 12)  # Bold for character names
            else:
                pdf.set_font("Helvetica", size=12)
            pdf.cell(0, line_height, line.strip(), ln=True)
    
    # Save PDF
    pdf_path = Path(__file__).parent / "data" / "test_script.pdf"
    pdf.output(str(pdf_path))
    print(f"Created PDF at: {pdf_path}")

if __name__ == "__main__":
    create_test_pdf() 