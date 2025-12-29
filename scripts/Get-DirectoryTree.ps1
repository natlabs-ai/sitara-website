# Script to display the file structure of a project directory as a tree and save to a Markdown file
# Excludes hidden/system files and common temporary/project artifact directories (e.g., .git, node_modules, bin, obj, .vs, __pycache__)
# Usage: Run in PowerShell terminal in VS Code
#        .\Get-DirectoryTree.ps1 -Path "C:\Path\To\Your\Project" -Depth 5 -OutputFile "tree.md"
#        If no path provided, uses current directory
#        Output is formatted as a Markdown code block for easy viewing

param (
    [string]$Path = (Get-Location).Path,
    [int]$Depth = 999,  # Max depth to recurse; set high for full tree
    [string]$OutputFile = "tree.md",
    [int]$CurrentDepth = 0,
    [string]$Indent = ""
)

# Common exclusions: hidden files/dirs (starting with .), and typical project temp dirs
$excludePatterns = @('.git', 'node_modules', 'bin', 'obj', '.vs', '__pycache__', 'venv', '.venv', '*.tmp', '*.log', 'out', 'next-env.d.ts')

# Function to recursively build directory tree string
function Build-Tree {
    param (
        [string]$DirPath,
        [int]$MaxDepth,
        [int]$Depth,
        [string]$Prefix
    )

    $treeOutput = ""
    # Get items, excluding hidden/system and patterns; sort dirs first
    $items = Get-ChildItem -Path $DirPath -Force | 
             Where-Object { 
                 $_.Name -notmatch '^\.' -and  # Exclude hidden (starting with .)
                 -not ($_.Attributes -band [System.IO.FileAttributes]::Hidden) -and
                 -not ($_.Attributes -band [System.IO.FileAttributes]::System) -and
                 $excludePatterns -notcontains $_.Name
             } | 
             Sort-Object -Property @{Expression={$_ -is [System.IO.DirectoryInfo]}; Descending=$true}, Name

    for ($i = 0; $i -lt $items.Count; $i++) {
        $item = $items[$i]
        $isLast = ($i -eq $items.Count - 1)
        $branch = if ($isLast) { "└── " } else { "├── " }
        $treeOutput += "$Prefix$branch$($item.Name)`n"

        if ($item -is [System.IO.DirectoryInfo] -and $Depth -lt $MaxDepth) {
            $newPrefix = "$Prefix$(if ($isLast) { '    ' } else { '│   ' })"
            $treeOutput += Build-Tree -DirPath $item.FullName -MaxDepth $MaxDepth -Depth ($Depth + 1) -Prefix $newPrefix
        }
    }

    return $treeOutput
}

# Build the tree string
$tree = "$Path`n"
$tree += Build-Tree -DirPath $Path -MaxDepth $Depth -Depth $CurrentDepth -Prefix $Indent

# Wrap in Markdown code block
$mdContent = "``````tree`n$tree``````"

# Write to Markdown file
$mdContent | Out-File -FilePath $OutputFile -Encoding utf8

Write-Output "Tree structure saved to $OutputFile"