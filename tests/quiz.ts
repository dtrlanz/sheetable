@Sheetable.orientation('transposed')
class Quiz {

    static Table = Sheetable.table(Quiz);

    constructor() {
        this.date = new Date();
        this.John = 0;
        this.Beth = 0;
        this.Salman = 0;
    }

    @Sheetable.index @Sheetable.label('')
    date: Date;

    [name: Capitalize<string>]: number | undefined;

}