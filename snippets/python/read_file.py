# "with" closes the file automatically, even if an error happens
with open("file.txt", "r", encoding="utf-8") as file:
    content = file.read()

# read line by line (memory friendly for big files)
with open("file.txt", encoding="utf-8") as file:
    for line in file:
        print(line.strip())
