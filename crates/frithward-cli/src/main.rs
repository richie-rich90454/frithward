use clap::Parser;

#[derive(Parser)]
#[command(name = "frithward", version, about = "Frithward media safety CLI.")]
struct Arguments {
    #[arg(short, long, default_value = "browser")]
    execution: String,
}

fn main() {
    let arguments = Arguments::parse();
    println!("execution={}", arguments.execution);
}
