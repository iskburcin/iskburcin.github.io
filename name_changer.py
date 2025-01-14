import os


def rename_jpg_files(directory):
    files = [f for f in os.listdir(directory) if f.endswith(".jpg")]

    files.sort()

    for index, file_name in enumerate(files, start=1):
        new_name = f"img{index}.jpg"
        old_path = os.path.join(directory, file_name)
        new_path = os.path.join(directory, new_name)

        os.rename(old_path, new_path)
        print(f"Renamed '{file_name}' to '{new_name}'")


rename_jpg_files("assets/images/fr")
