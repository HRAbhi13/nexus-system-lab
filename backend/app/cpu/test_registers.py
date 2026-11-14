from registers import RegisterFile

cpu = RegisterFile()

cpu.write("R1", 10)
cpu.write("R2", 20)

print("R1:", cpu.read("R1"))
print("R2:", cpu.read("R2"))

print("\nAll Registers:")
cpu.display()

print("\nResetting CPU...")
cpu.reset()

cpu.display()