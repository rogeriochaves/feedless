//
//  ContentView.swift
//  feedless
//
//  Created by Rogerio Chaves on 28/04/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

func statusToString(status: SSBStatus) -> String {
    switch status {
    case .initializing:
        return "Initializing"
    case .indexing:
        return "Indexing"
    case .syncing:
        return "Syncing"
    case .ready:
        return "Ready"
    }
}

struct Index: View {
    @EnvironmentObject var context : Context
    @State var timer = Timer.publish(every: 5, on: .main, in: .common).autoconnect()

    var body: some View {
        Group {
            VStack {
                if (context.status != .ready) {
                    Text(statusToString(status: context.status))
                    if (context.status == .indexing && context.indexing.target > 0) {
                        Text(String(context.indexing.current) + "/" + String(context.indexing.target))
                    }
                }
                if (context.ssbKey != nil) {
                    MainScreen()
                } else {
                    NavigationView {
                        Login()
                        .navigationBarTitle(Text("Login"))
                    }
                }
            }
        }
        .onReceive(self.timer) { (_) in
            if (self.context.status != .ready) {
                self.context.fetch()
            }
        }
    }
}

struct Index_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            Index()
                .environmentObject(Context(ssbKey: nil, status: .initializing))

            Index()
                .environmentObject(
                    Context(
                        ssbKey: SSBKey(
                            curve: "foo",
                            publicKey: "bar",
                            privateKey: "baz",
                            id: "qux"
                        ),
                        status: .ready
                    )
            )
        }
    }
}

