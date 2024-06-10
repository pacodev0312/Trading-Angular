import { Component, Input } from '@angular/core';
import { LocalStorageService } from 'ngx-localstorage';
import { NTVoyagerApiWtp, WatchlistDTO } from 'src/app/services/api.service';
import { isArray } from '@amcharts/amcharts5/.internal/core/util/Type';
import { ToastrService } from 'ngx-toastr';
import { NewwatchlistComponent } from '../../templates/newwatchlist/newwatchlist.component';
import { Store, select } from '@ngrx/store';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { RenameWatchlistNameComponent } from '../../templates/rename-watchlist-name/rename-watchlist-name.component';
import { DeleteWatchlistComponent } from '../../templates/delete-watchlist/delete-watchlist.component';
import { InstrumentSearchComponent } from '../../templates/instrument-search/instrument-search.component';
import { UpdateChartInfo, UpdateMarketData, UpdateStockInfo } from 'src/app/reducers/market/market.action';
import { getMarketData } from 'src/app/reducers/market/market.selector';
import { ItemUpdate, LightstreamerClient, Subscription } from 'lightstreamer-client-web/lightstreamer.esm';
import { lsClient } from 'src/app/services/lightstreamer/lsClient';
import { LstreamerService } from 'src/app/services/lightstreamer/lstreamer.service';
import { NewOrderComponent } from '../../templates/new-order/new-order.component';

@Component({
  selector: 'app-watchlist',
  templateUrl: './watchlist.component.html',
  styleUrls: ['./watchlist.component.css'],
})
export class WatchlistComponent {
  selectedWatchlist: any;
  watchlists: any;
  instruments: any;
  symbol: any;
  ThreeLineDepth: any;
  selWlId: any;
  // test
  // client: LightstreamerClient;
  // items = ["NUTEX.EQ.Q2Q","NUTEX.EQ.PEC","NUTEX.EQ.UNG","NUTEX.EQ.VBG","NUTEX.EQ.SFC","NUTEX.EQ.HPO","NUTEX.EQ.GDI","NUTEX.EQ.ABC","NUTEX.EQ.HTP","NUTEX.EQ.TWM"];
  // field = ["L", "H", "BS1", "BP1", "AP1", "AS1", "LTP", "LTS", "LTT", "CHG", "CHGP", "CLS"];

  constructor(
    private lss: LocalStorageService,
    private apiService: NTVoyagerApiWtp,
    private notif: ToastrService,
    private store: Store,
    private modalService: NgbModal,
    private lsService: LstreamerService
  ) {
    this.symbol = '';
    this.watchlists = this.lss.get<WatchlistDTO[]>('watchlists');
    this.selectedWatchlist = this.lss.get<WatchlistDTO>('watchlist');
    this.instruments = this.lss.get('instruments')
    if(this.lss.get('ThreeLineDepth') == null){
      this.lss.set('ThreeLineDepth', false)
    } else {
      this.ThreeLineDepth = this.lss.get('ThreeLineDepth')
    }

    // var sub = new Subscription('MERGE', this.items, this.field);
    // sub.setDataAdapter('NTMARKETDATA');
    // sub.setRequestedSnapshot("yes");
    // sub.setRequestedMaxFrequency(1);
    // sub.addListener(this);
    // this.client = lsClient;
    // this.client.connect()
    // this.client.subscribe(sub)
  }

  // onItemUpdate(update: ItemUpdate){
  //   console.log(update)
  //   var itemPos = update.getItemPos();
  //   var that = this;
  //   function getStockItem(update: ItemUpdate, itemPos: number, instrument: any){
  //     for (var f of that.field) {
  //       var val: string = update.getValue(f);
  //       if((val !== ' ') && (val !== null) && parseFloat(val)){
  //         if(f == 'B1'){
  //           console.log(val)
  //         }
  //         instrument[f] = val;
  //       }
  //     }
  //   }
  //   getStockItem(update, itemPos, this.instruments[itemPos-1]);
  // }

  onItemUpdate(update: ItemUpdate, obj: any){
    var itemPos = update.getItemPos();
    for (var f of obj) {
      var val: string = update.getValue(f);
      var chgp = update.getValue("CHGP");
      if(parseFloat(chgp) < 0){
        this.instruments[itemPos-1]["chgColour"] = 'danger'
      }
      if(parseFloat(chgp) > 0){
        this.instruments[itemPos-1]["chgColour"] = 'success'
      }
      if(parseFloat(chgp) === 0){
        this.instruments[itemPos-1]["chgColour"] = 'warning'
      }
      if((val !== ' ') && (val !== null) && parseFloat(val)){
        if(f === "CHGP"){
          this.instruments[itemPos-1]["CHGP"] = chgp;
        } else {
          this.instruments[itemPos-1][f] = val;
        }
      }
    }
  }


  ngOnInit() {
    this.store.select(getMarketData).subscribe(
      (res) => {
        this.watchlists = this.lss.get('watchlists');
        this.selectedWatchlist = this.lss.get<WatchlistDTO>('watchlist');
        this.selWlId = this.selectedWatchlist.id;
        this.instruments = this.lss.get('instruments');
        this.lsService.subscribeWatchlists(this)
      }
    )
    this.watchlists = this.lss.get('watchlists');
    this.selectedWatchlist = this.lss.get<WatchlistDTO>('watchlist');
    this.selWlId = this.selectedWatchlist.id;
    this.instruments = this.lss.get('instruments')
    this.lsService.subscribeWatchlists(this)
  }
  
  ngOnChanges(){
    console.log(this.watchlists)
  }

  toggleDepth() {
    this.ThreeLineDepth = !this.ThreeLineDepth;
    console.log(this.ThreeLineDepth)
    this.lss.set('ThreeLineDepth', this.ThreeLineDepth);
    if (this.ThreeLineDepth) {
      var instruments: any = this.lss.get('instruments');
      instruments.forEach((ele: any) => {
        ele.BP2 = '0';
        ele.BS2 = '0';
        ele.AP2 = '0';
        ele.AS2 = '0';
        ele.BP3 = '0';
        ele.BS3 = '0';
        ele.AP3 = '0';
        ele.AS3 = '0';
      });
      this.lss.set('instruments', instruments);
    }
  }

  trackByFn(index: number, item: any) {
    return item.id; // Replace with the unique identifier property of your Watchlist interface or model
  }

  watchlistChanged() {
    console.log(this.selWlId)
    if (this.selWlId) {
      var that = this;
      var temp = this.watchlists.filter(function (ele:any) {
        return ele.id === that.selWlId;
      })
      this.selectedWatchlist = temp[0]
      this.lss.set('watchlist', this.selectedWatchlist)
      this.lss.set('instruments', []);
      this.lss.set('wlSubscriptions', []);
      this.apiService.instrumentsAll(this.selectedWatchlist.id).subscribe(
        (res) => {
          if (isArray(res)) {
            this.lss.set('instruments', []);
            this.lss.set('wlSubscriptions', []);
            var temp: any = [];
            var subTemp: any = [];
            res.forEach((ele: any) => {
              temp.push(
                instrument(
                  String(ele.pesk),
                  String(ele.symbol),
                  String(ele.name)
                )
                );
              subTemp.push(ele.pesk)
            });
            // wlSubscription save
            this.lss.set('subWlList', subTemp)
            this.lss.set('instruments', temp);
            this.instruments = temp;
            this.lsService.subscribeWatchlists(this)
          }
        },
        (err) => [console.log(err)]
      );
    }
  }

  keypress(event: KeyboardEvent): void {
    this.lss.set('indexWLStr', SearchAction('WL',this.symbol))
    if (event.key === 'Enter' && this.symbol !== null && this.symbol !== '') {
      this.searchInstrument();
      event.preventDefault();
    }
  }

  searchInstrument() {
    const modalRef = this.modalService.open(InstrumentSearchComponent, { backdrop: 'static', modalDialogClass: 'modal-lg' });
    modalRef.componentInstance.instrumentCollection = SearchAction('WL',this.symbol)
    
    modalRef.result.then((doAction) => {
      console.log('doAction event')
      // tradableInstrument = selectedInstrument;
      // this.openOrderEntry(od, tradableInstrument);
      },
      (dismissReason) => {
        console.log('Modal dismissed:', dismissReason);
      }
    );
    this.symbol = ''
  }

  navstockInfo(pesk: any, symbol: any, name: any) {
    this.lss.set('siPesk', pesk);
    this.lss.set('siSymbol', symbol);
    this.lss.set('siName', name);
    this.store.dispatch(UpdateStockInfo({stockInfo: ('stockInfo' + new Date().getTime())}));
    // this.store.dispatch(UpdateChartInfo({chartData: 'chartData' + new Date().getTime()}))
  }

  subscribeData() {
    // TODO your code
  }

  removeInstrument(item: any) {
    var oldInstruments: any = this.lss.get('instruments');
    var newInstruments: any = [];
    oldInstruments.forEach((cell:any) => {
      if(cell.pesk !== item.pesk){
        newInstruments.push(cell);
      }
    })
    console.log(newInstruments)
    this.instruments = newInstruments;
    this.lss.set('instruments', newInstruments);
    this.apiService.updatePesks2({watchlistId: this.selectedWatchlist?.id, pesks: [item.pesk]} as any).subscribe(
      (res) =>{
        console.log(res)
      }
    )
  }

  newWatchlist() {
    var temp: any = this.lss.get('watchlists')
    if (temp.length === 3) {
      this.notif.warning(
        'You currently have reached your watchlist limit of 3. Cannot add more watchlists.',
        'Limit reached!',
      );
      return ;
    }

    const modalRef = this.modalService.open(NewwatchlistComponent, { backdrop: 'static', modalDialogClass: 'modal-lg' });
    // modalRef.componentInstance.instrumentCollection = data.items;
    
    modalRef.result.then((selectedInstrument) => {
      // tradableInstrument = selectedInstrument;
      // this.openOrderEntry(od, tradableInstrument);
      },
      (dismissReason) => {
        console.log('Modal dismissed:', dismissReason);
      }
    );
  }

  renameWatchlist() {
    // modal issue newWatchlist
    if(!this.lss.get('watchlist') || this.lss.get('watchlist') == "" || this.lss.get('watchlist') == undefined){
      this.notif.warning('Please select a watchlist to rename.', 'Rename')
      return ;
    }
    const modalRef = this.modalService.open(RenameWatchlistNameComponent, { backdrop: 'static', modalDialogClass: 'modal-lg' });
    modalRef.componentInstance.instrumentCollection = this.selectedWatchlist;
    
    modalRef.result.then((selectedInstrument) => {
      // tradableInstrument = selectedInstrument;
      // this.openOrderEntry(od, tradableInstrument);
      },
      (dismissReason) => {
        console.log('Modal dismissed:', dismissReason);
      }
    );
  }

  deleteWatchlist() {
    if(!this.lss.get('watchlist') || this.lss.get('watchlist') == "" || this.lss.get('watchlist') == undefined){
      this.notif.warning('Please select a watchlist to delete.', 'Warning')
      return ;
    }
    const modalRef = this.modalService.open(DeleteWatchlistComponent, { backdrop: 'static', modalDialogClass: 'modal-lg' });
    // modalRef.componentInstance.instrumentCollection = data.items;
    
    modalRef.result.then((selectedInstrument) => {
      // tradableInstrument = selectedInstrument;
      // this.openOrderEntry(od, tradableInstrument);
      },
      (dismissReason) => {
        console.log('Modal dismissed:', dismissReason);
      }
    );
  }

  newOrder(side: string, price: string, pesk: string) {
    const modalRef = this.modalService.open(NewOrderComponent, { backdrop: 'static', modalDialogClass: 'modal-lg' });
    // modalRef.componentInstance.instrumentCollection = data.items;
    
    modalRef.result.then((selectedInstrument) => {
      // tradableInstrument = selectedInstrument;
      // this.openOrderEntry(od, tradableInstrument);
      },
      (dismissReason) => {
        console.log('Modal dismissed:', dismissReason);
      }
    );
    // try {
    //   var od = OrderDetails(side, price, pesk);
    //   // if ($rootScope.swapWatchlistBuySell) {
    //   if (od.Side === 'B') {
    //     od.Side = 'S';
    //   } else {
    //     od.Side = 'B';
    //   }
    //   // }
    //   var tradableInstrument = null;
    //   //Find all tradable instruments by Public Exchange Symbol Key
    // } catch (error) {
    //   this.notif.error(String(error), 'Warning!');
    // }
  }

  openOrderEntry() {}

  openModal(content: any) {
    this.modalService.open(content);
  }

  dismissAll(){
    this.modalService.dismissAll()
  }
}

function instrument(pesk: string, symbol: string, name: string) {
  var res = {
    pesk: pesk,
    symbol: symbol,
    name: name,
    BS1: '0',
    BP1: '0',
    AP1: '0',
    AS1: '0',
    BS2: '0',
    B2: '0',
    A2: '0',
    AS2: '0',
    BS3: '0',
    B3: '0',
    A3: '0',
    AS3: '0',
    LTP: '0',
    LTS: '0',
    LTT: '00:00:00',
    CHG: '0',
    CHGP: '0',
    CLS: '0',
    L: '0',
    H: '0',
    chgColour: 'warning',
  };
  return res;
}

function OrderDetails(s: any, p: any, i: any) {
  var res = {
    FixSession: '',
    Side: s,
    Price: Number(p),
    Exchange: '',
    TESK: '',
    Symbol: '',
    Quantity: 0,
    Account: '',
    OrderType: 'LO',
    TIF: 'GFD',
    Expiry: '',
    Notes: '',
    PESK: i,
    Instrument: null,
    TriggerPrice: null,
  };

  return res;
}

function SearchAction(a: any, s: any) {
  var res = {
    action : a,
    searchString : s
  }
  return res;
};