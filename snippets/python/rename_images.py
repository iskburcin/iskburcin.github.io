import os

def rename_jpg_files(directory: str) -> None:
    """Rename every .jpg in a folder to img1.jpg, img2.jpg, ...
    I use this to prepare travel photos for my website."""
    files = sorted(f for f in os.listdir(directory) if f.endswith(".jpg"))
    for index, file_name in enumerate(files, start=1):
        old_path = os.path.join(directory, file_name)
        new_path = os.path.join(directory, f"img{index}.jpg")
        os.rename(old_path, new_path)
        print(f"Renamed '{file_name}' -> 'img{index}.jpg'")

rename_jpg_files("assets/images/fr")
