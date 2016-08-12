import {Injectable} from '@angular/core';
import {Animal} from "../model/Animal";
import {Observable} from 'rxjs/Observable';

declare var PouchDB: any;

@Injectable()
export class AnimalService {

    private db: any;
    private pouchDatabaseName = 'mytestdb';

    constructor() {

    }

    initDb(): Observable<any> {
        return Observable.create((observer: any) => {
            new PouchDB(this.pouchDatabaseName).destroy().then(() => {
                observer.complete();
            });
        });
    }

    replicate(live: boolean): Observable<any> {

        this.db = new PouchDB(this.pouchDatabaseName);

        let source = new PouchDB('http://localhost:4984/r_animal');
        let options = {
            live: live,
            retry: true,

            source: "SyncGatewayUrl",
            target: "r_animal",
            filter: "sync_gateway/bychannel",
            query_params: {
                channels: "test"
            },
            back_off_function: function (delay: any) {
                if (delay === 0) {
                    return 1000;
                }
                let finalDelay: number = delay * 3;
                console.log('retry with delay=' + finalDelay);
                return finalDelay;
            }
        };

        let observable: Observable<any> = Observable.create((observer: any) => {
            PouchDB.replicate(source, this.db, options).on('change', (info: any) => {
                console.log("replication change event");
                // handle change
            }).on('paused', (err: any) => {
                console.log("replication paused event");
                observer.next();
                // replication paused (e.g. replication up to date, user went offline)
            }).on('active', () => {
                console.log("replication active event");
                // replicate resumed (e.g. new changes replicating, user went back online)
            }).on('denied', function (err: any) {
                console.log("replication denied event");
                // a document failed to replicate (e.g. due to permissions)
            }).on('complete', (info: any) => {
                console.log("replication complete event");
                observer.complete();
                // handle complete
            }).on('error', (err: any) => {
                console.log("replication error event");
                // handle error
            });
        });
        return observable;
    }

    getAnimals(): Observable<Animal> {
        console.log('get Animal start');

        return Observable.create((observer: any) => {

            this.db.allDocs().then((allDocs: any) => {
                for (let row of allDocs.rows) {
                    this.db.get(row.id).then((doc: any) => {
                        observer.next(doc as Animal);
                    }).catch(function (err: any) {
                        console.log("can\'t retrieve document " + row.id + ", error=" + err);
                    });

                }
            });

        });
    }

    createAnimal(newAnimal: Animal): Observable<any> {
        console.log('create Animal start : ' + newAnimal._id);
        newAnimal.channels = ["test"];
        return Observable.create((observer: any) => {
            this.db.put(newAnimal).then(() => {
                observer.complete();
            });
        });
    }

    startUpstreamReplication() {
        console.log("startUpstreamReplication");
        this.db = new PouchDB(this.pouchDatabaseName);

        let distantServer = new PouchDB('http://localhost:4984/r_animal');
        let options = {
            live: true,
            retry: true,
            back_off_function: function () {
                return 8000;
            }
        };

        PouchDB.replicate(this.db, distantServer, options).on('change', (info: any) => {
            console.log("upload change event :" + info);
            // handle change
        }).on('paused', (err: any) => {
            console.log("upload paused event");
            // upload paused (e.g. upload up to date, user went offline)
        }).on('active', () => {
            console.log("upload active event");
            // replicate resumed (e.g. new changes replicating, user went back online)
        }).on('denied', function (err: any) {
            console.log("upload denied event");
            // a document failed to replicate (e.g. due to permissions)
        }).on('complete', (info: any) => {
            console.log("upload complete event");
            // handle complete
        }).on('error', (err: any) => {
            console.log("upload error event");
            // handle error
        });
    }
}
