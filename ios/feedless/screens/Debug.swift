//
//  ContentView.swift
//  feedless
//
//  Created by Rogerio Chaves on 28/04/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct Debug: View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var router : Router
    @EnvironmentObject var entries : Entries

    func entriesList() -> some View {
        switch entries.entries {
        case .notAsked:
            return AnyView(EmptyView())
        case .loading:
            return AnyView(Text("Loading..."))
        case let .success(debug):
            return AnyView(List(debug.entries, id: \.key) { entry in
                VStack(alignment: .leading) {
                    Text(entry.value)
                }
            })
        case let .error(message):
            return AnyView(Text(message))
        }
    }

    var body: some View {
        UITableView.appearance().backgroundColor = Styles.uiWhite

        return entriesList()
        .navigationBarTitle(Text("Debug"))
        .onAppear() {
            self.entries.load(context: self.context)
            self.router.updateNavigationBarColor(route: .debug)
        }
    }
}

struct Debug_Previews: PreviewProvider {
    static var previews: some View {
        Debug()
        .environmentObject(Entries())
    }
}
