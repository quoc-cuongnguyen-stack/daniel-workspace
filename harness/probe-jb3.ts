import { Sandbox } from "just-bash";
const jb = await Sandbox.create({
  overlayRoot: process.cwd(),
  defenseInDepth: false,
});
const cmd = await jb.runCommand("echo 'hello' > probe-scratch.txt", { cwd: "/home/user/project" });
const fin = await cmd.wait();
console.log("exit", fin.exitCode);
console.log("overlay:", JSON.stringify(await jb.readFile("/home/user/project/probe-scratch.txt")));
