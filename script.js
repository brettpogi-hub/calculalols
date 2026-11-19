function insert(num)
{
    const total = document.form1.textview.value;
    document.form1.textview.value = total + num;
}

function equal(){
    let total = document.form1.textview.value;

    if (total) {
        total = eval(total);
        document.form1.textview.value = total;
    }
}

function backspace(){
    let total = document.form1.textview.value;
    total = total.slice(0, -1);
    document.form1.textview.value = total;
}