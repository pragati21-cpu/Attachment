import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class AttachmentsComponent implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _notifyOutputChanged: () => void;
    private _fileSections: HTMLDivElement[] = [];
    private _fileCount: number = 0;
    private readonly _maxFiles: number = 10;
    private _chooseFileButton: HTMLButtonElement;
    private _files: { name: string, content: string, blobUrl: string , size: number}[] = []; // Store files with blobUrl and size
    private _errorMessage: HTMLDivElement; // Error message element
    private _fileNamesContainer: HTMLDivElement; // Container for file names
    private _context: ComponentFramework.Context<IInputs>;

    constructor() { }

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        this._container = container;
        this._notifyOutputChanged = notifyOutputChanged;
        this._context = context;

        // Only check the 'active' parameter, assuming it controls component activation
        const isActive = this._context.parameters.active.raw !== false; // Active by default

        const isDeactive = this._context.parameters.deactive?.raw === true;

        if (!isActive || isDeactive) {
            this._container.innerHTML = '<div>The component is inactive.</div>';
            return;
        }

        console.log("Component is active");


        

        // Load external stylesheets and set up file upload UI
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
        document.head.appendChild(link);

        const note = document.createElement('div');
         note.innerText = `You can upload up to ${this._maxFiles} PDF files.`;
        note.style.marginBottom = "10px";
        this._container.appendChild(note);

        this._errorMessage = document.createElement('div');
        this._errorMessage.style.color = 'red';
        this._errorMessage.style.marginTop = '5px';
        this._errorMessage.style.display = 'none';
        this._container.appendChild(this._errorMessage);

        this.addFileSection();
    }

    private addFileSection(): void {
        const fileSection = document.createElement("div");
        fileSection.className = "file-section";

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".pdf";
        fileInput.multiple = true;
        fileInput.style.display = "none";

        this._chooseFileButton = document.createElement("button");
        this._chooseFileButton.innerText = "Choose Files";
        this._chooseFileButton.title = "Select PDF files to attach. Upload only PDF files.";
        this._chooseFileButton.addEventListener("click", () => {
            fileInput.click();
        });

        this._fileNamesContainer = document.createElement("div");
        this._fileNamesContainer.style.display = "flex";
        this._fileNamesContainer.style.flexDirection = "column";
        this._fileNamesContainer.style.marginLeft = "10px";
        this._fileNamesContainer.style.width = "100%";
        this._fileNamesContainer.style.maxHeight = "150px";
        this._fileNamesContainer.style.overflowY = "auto";


        ///////////////////////////////////////////////////////////////////////////////////////////////////////// updated code 

        
        fileInput.addEventListener("change", async () => {
            const selectedFiles = fileInput.files;
            if (selectedFiles) {
                let invalidFileSelected = false;
                let maxFilesExceeded = false;
                let filesToAdd = Array.from(selectedFiles);

                if (this._fileCount + filesToAdd.length > this._maxFiles) {
                    maxFilesExceeded = true;
                    filesToAdd = filesToAdd.slice(0, this._maxFiles - this._fileCount);
                }

                // Batch DOM updates for performance
                const fragment = document.createDocumentFragment();

                for (const file of filesToAdd) {
                    if (this.isValidPDF(file)) {
                const { base64Content, blobUrl, size } = await this.readFileAsBase64AndBlob(file);
                this._files.push({ name: file.name, content: base64Content, blobUrl , size });
                        this._fileCount++;
                this.addFileDisplay(fragment, file, blobUrl, size);
                    } else {
                        invalidFileSelected = true;
                    }
                }

                this._fileNamesContainer.appendChild(fragment);
                // Show error message if invalid files were selected
                if (invalidFileSelected) {
                    this.showError("Please select only PDF files.");
                } else if (maxFilesExceeded) {
                    this.showError(`You can upload up to ${this._maxFiles} PDF files.`);
                } else {
                    this.hideError(); // Hide error message when conditions are valid
                }


                if (maxFilesExceeded) {
                    this.showError(`You can upload up to ${this._maxFiles} PDF files.`);
                }

                // Reset file input
                fileInput.value = "";

                this.updateChooseFileButtonState();
                this._notifyOutputChanged();
            }
        });

        fileSection.appendChild(this._chooseFileButton);
        fileSection.appendChild(this._fileNamesContainer);
        fileSection.appendChild(fileInput);

        this._container.appendChild(fileSection);
        this._fileSections.push(fileSection);
    }

    private isValidPDF(file: File): boolean {
        return file.type === 'application/pdf';
    }

private addFileDisplay(container: DocumentFragment, file: File, blobUrl: string, size: number): void {
        const fileDisplay = document.createElement("div");
        fileDisplay.className = "file-display";
        fileDisplay.style.display = "flex";

        const fileName = document.createElement("a");
        fileName.className = "file-name";
fileName.innerText = `${this.truncateFileName(file.name)} (${(size / 1024).toFixed(2)} KB)`;
fileName.title = `${file.name} - ${size} bytes`;
        fileName.href = blobUrl;
        fileName.target = "_blank";
        fileName.download = file.name;
        fileName.style.marginRight = "10px";

        const removeButton = document.createElement("button");
        removeButton.className = "remove-button";
        removeButton.innerHTML = '<i class="fa fa-times" aria-hidden="true"></i>';
        removeButton.title = "Remove this file";

        removeButton.addEventListener("click", () => {
            fileDisplay.remove();
            this._files = this._files.filter(f => f.name !== file.name);
            this._fileCount--;

            if (this._fileCount <= this._maxFiles) {
                this.hideError();  // Hide error message when within allowed limit
            }
            this.updateChooseFileButtonState();
            this._notifyOutputChanged();
        });

        fileDisplay.appendChild(fileName);
        fileDisplay.appendChild(removeButton);
        container.appendChild(fileDisplay);
    }

    // Single read for both base64 and Blob URL
private readFileAsBase64AndBlob(file: File): Promise<{ base64Content: string, blobUrl: string, size: number }> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64Content = reader.result as string;
                const blob = new Blob([reader.result as ArrayBuffer], { type: file.type });
                const blobUrl = URL.createObjectURL(blob);
                const size = file.size;
        resolve({ base64Content, blobUrl, size });
            };
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    private truncateFileName(fileName: string, maxLength: number = 30): string {
        return fileName.length > maxLength ? `${fileName.substr(0, maxLength - 3)}...` : fileName;
    }

    private updateChooseFileButtonState(): void {
        this._chooseFileButton.disabled = this._fileCount >= this._maxFiles;
    }

    private showError(message: string): void {
        this._errorMessage.innerText = message;
        this._errorMessage.style.display = 'block';
    }

    private hideError(): void {
        this._errorMessage.innerText = '';
        this._errorMessage.style.display = 'none';
    }

  
    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._context = context;

        const isActive = this._context.parameters.active.raw !== false; // Active by default
        const isInactive = this._context.parameters.deactive.raw === true;

        if (!isActive || isInactive) {
            this._container.innerHTML = '<div>The component is inactive.</div>';
        }
    }

    public getOutputs(): IOutputs {
        return {
            fileCount: this._fileCount,
            files: JSON.stringify(this._files)
        };
    }

    public destroy(): void {
        this._fileSections.forEach(section => this._container.removeChild(section));
        this._fileSections = [];
    }
}


