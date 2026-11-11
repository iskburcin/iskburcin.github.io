class Counter extends StatefulWidget {
  const Counter({super.key});

  @override
  State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int _count = 0;

  @override
  Widget build(BuildContext context) {
    return TextButton(
      // setState tells Flutter to rebuild this widget
      onPressed: () => setState(() => _count++),
      child: Text('Clicked $_count times'),
    );
  }
}
