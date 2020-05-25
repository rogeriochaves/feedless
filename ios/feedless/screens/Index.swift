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
    @EnvironmentObject var profiles : Profiles
    @EnvironmentObject var secrets : Secrets
    @State var timer = Timer.publish(every: 5, on: .main, in: .common).autoconnect()

    func progressBar() -> some View {
        let width = CGFloat(self.context.indexing.current) / CGFloat(self.context.indexing.target) * 100;

        return ZStack(alignment: .leading) {
            Capsule()
                .foregroundColor(Styles.lightGray)
                .frame(width: 100, height: 10)

            Capsule()
                .frame(width: width, height: 10)
                .foregroundColor(Styles.primaryBlue)
                .animation(.easeIn)
        }
    }

    let mainScreen = MainScreen()
    let login = Login()

    var body: some View {
        VStack(spacing: 0) {
            if (context.ssbKey != nil) {
                mainScreen
                    .onAppear(perform: {
                        self.profiles.load(context: self.context, id: self.context.ssbKey!.id)
                        self.secrets.load(context: self.context)
                    })
            } else {
                NavigationView {
                    login
                        .navigationBarTitle(Text("Login"))
                }
            }
            if (context.status != .ready) {
                Divider()
                .padding(.vertical, 10)
                HStack {
                    Text(statusToString(status: context.status))
                    if ((context.status == .indexing || context.status == .syncing) && context.indexing.target > 0) {
                        progressBar()
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
    static func indexingContext () -> Context {
        let context = Context(ssbKey: nil, status: .indexing)
        context.indexing = IndexingState(current: 30, target: 100)
        return context
    }

    static var previews: some View {
        Group {
            Index()
                .environmentObject(indexingContext())

            Index()
                .environmentObject(Samples.context())
                .environmentObject(Samples.profiles())
                .environmentObject(ImageLoader())
        }
    }
}

